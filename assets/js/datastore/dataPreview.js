/*
 * Module for preview table
 */
window.DataPreview = (function($, DataPreview) {
    var $previewTable = $("#previewTable");

    var tableName = null;
    var rawData   = null;

    var hasHeader   = false;
    var delimiter   = "";
    var highlighter = "";
    var dsFormat    = "CSV";
    var rowsToFetch = 40; // constant

    var promoteHeader =
            '<div class="header"' +
                'title="Undo Promote Header" ' +
                'data-toggle="tooltip" ' +
                'data-placement="top" data-container="body">' +
                '<span class="icon"></span>' +
            '</div>';
    var promoteTd =
            '<td class="lineMarker promote" ' +
                'title="Promote Header" data-toggle="tooltip" ' +
                'data-placement="top" data-container="body">' +
                '<div class="promoteWrap">' +
                    '<div class="iconWrapper">' +
                        '<span class="icon"></span>' +
                    '</div>' +
                    '<div class="divider"></div>' +
                '</div>' +
            '</td>';

    var $previeWrap = $("#dsPreviewWrap");

    DataPreview.setup = function() {
        // promot header
        $previewTable.on("click", ".promote, .undo-promote", function() {
            togglePromote();
        });

        // select a char as candidate delimiter
        $previewTable.mouseup(function() {
            if ($previewTable.hasClass("has-delimiter")) {
                return;
            }

            var selection;
            if (window.getSelection) {
                selection = window.getSelection();
            } else if (document.selection) {
                selection = document.selection.createRange();
            }

            highlightDelimiter(selection.toString());
        });

        $("#preview-apply").click(applyPreviewChange);

        $("#preview-minimize").click(function() {
            toggleMinimize();
        });

        // close preview
        $("#preview-close").click(function() {
            clearAll();
        });

        // hightlight and remove highlight button
        var $highLightBtn    = $("#preview-highlight");
        var $rmHightLightBtn = $("#preview-rmHightlight");

        $highLightBtn.click(function() {
            if (!$highLightBtn.hasClass("active") || highlighter === "") {
                return;
            }
            delimiter = highlighter;
            highlighter = "";

            applyDelim();
        });

        $rmHightLightBtn.click(function() {
            if (!$rmHightLightBtn.hasClass("active") || delimiter !== "") {
                // case of remove delimiter
                delimiter = "";

                $highLightBtn.removeClass("active");
                $rmHightLightBtn.removeClass("active")
                        .attr("data-original-title", "Remove highlights");
                getPreviewTable();
            } else {
                // case of remove highlighter
                highlighter = "";
                toggleHighLight();
            }
        });

        // resize column
        $previewTable.on("mousedown", ".colGrab", function(event) {
            if (event.which !== 1) {
                return;
            }
            gRescolMouseDown($(this), event, {target: "datastore"});
            dblClickResize($(this), {minWidth: 25, target: "datastore"});
        });

        var $suggSection = $("#previewSugg");
        $suggSection.on("click", ".apply-highlight", function() {
            $highLightBtn.click();
        });

        $suggSection.on("click", ".rm-highlight", function() {
            $rmHightLightBtn.click();
        });

        $suggSection.on("click", ".promote", function() {
            togglePromote();
        });

        $suggSection.on("click", ".commaDelim", function() {
            delimiter = ",";
            highlighter = "";
            applyDelim();
        });

        $suggSection.on("click", ".tabDelim", function() {
            delimiter = "\t";
            highlighter = "";
            applyDelim();
        });

        $suggSection.on("click", ".pipeDelim", function() {
            delimiter = "|";
            highlighter = "";
            applyDelim();
        });

        $suggSection.on("click", ".jsonLoad", function() {
            dsFormat = "JSON";
            applyPreviewChange();
        });

        $suggSection.on("click", ".excelLoad", function() {
            dsFormat = "Excel";
            if ($(this).hasClass("hasHeader")) {
                hasHeader = true;
            }

            applyPreviewChange();
        });

        $suggSection.on("click", ".apply-all", function() {
            applyPreviewChange();
        });

        function applyDelim() {
            $highLightBtn.removeClass("active");
            $rmHightLightBtn.addClass("active")
                            .attr("data-original-title", "Remove Delimiter");
            getPreviewTable();
        }
    };

    DataPreview.show = function() {
        var deferred = jQuery.Deferred();
        var loadURL  = $("#filePath").val().trim();
        var refId;
        var $waitSection;
        var $errorSection;

        $("#importDataForm").on("keypress.preview", function(event) {
            if (event.which === keyCode.Enter) {
                applyPreviewChange();
                return false;
            }
        });

        var $loadHiddenSection = $previeWrap.find(".loadHidden").hide();
        $("#preview-url").text(loadURL);

        XcalarListFiles(loadURL)
        .then(function() {
            $("#importDataForm").addClass("previewMode");

            $previeWrap.removeClass("hidden");
            $waitSection = $previeWrap.find(".waitSection")
                                        .removeClass("hidden");
            $errorSection = $previeWrap.find(".errorSection")
                                        .addClass("hidden");

            tableName = $("#fileName").val().trim();
            tableName = xcHelper.randName(tableName) ||   // when table name is empty
                        xcHelper.randName("previewTable");
            tableName += ".preview"; // specific format for preview table

            var sqlOptions = {
                "operation" : SQLOps.PreviewDS,
                "dsPath"    : loadURL,
                "dsName"    : tableName,
                "dsFormat"  : "raw",
                "hasHeader" : hasHeader,
                "fieldDelim": "Null",
                "lineDelim" : "\n",
                "moduleName": "Null",
                "funcName"  : "Null"
            };

            XcalarLoad(loadURL, "raw", tableName, "", "\n", hasHeader, "", "",
                       sqlOptions)
            .then(DS.release)
            .then(function() {
                return XcalarSample(tableName, rowsToFetch);
            })
            .then(function(result) {
                $waitSection.addClass("hidden");
                refId = gDatasetBrowserResultSetId;
                // set it to 0 because releaseDatasetPointer() use it to check
                // if ds's ref count is cleard
                // preiview table should use it's own clear method
                gDatasetBrowserResultSetId = 0;
                // no need for refId as we only need 40 samples
                XcalarSetFree(refId);

                if (!result) {
                    cannotParseHandler();
                    deferred.reject({"error": "Cannot parse the dataset."});
                    return (promiseWrapper(null));
                }

                var kvPairs = result.kvPair;
                var numKvPairs = result.numKvPairs;

                rawData = [];

                var value;
                var json;

                try {
                    for (var i = 0; i < numKvPairs; i++) {
                        value = kvPairs[i].value;
                        json = $.parseJSON(value);

                        // get unique keys
                        for (var key in json) {
                            if (key === "recordNum") {
                                continue;
                            }
                            rawData.push(json[key].split(""));
                        }
                    }

                    if (gMinModeOn) {
                        $loadHiddenSection.show();
                    } else {
                        $loadHiddenSection.fadeIn(200);
                    }

                    getPreviewTable();
                    deferred.resolve();
                } catch(err) {
                    console.error(err, value);
                    cannotParseHandler();
                    deferred.reject({"error": "Cannot parse the dataset."});
                }

                $(window).on("resize", resizePreivewTable);
            })
            .fail(function(error) {
                $waitSection.addClass("hidden");
                clearAll();
                StatusBox.show(error.error, $("#filePath"), true);
                deferred.reject(error);
            });
        })
        .fail(function(error) {
            StatusBox.show(error.error, $("#filePath"), true);
            deferred.reject(error);
        });

        return (deferred.promise());

        function cannotParseHandler() {
            $errorSection.html("Cannot parse the dataset.")
                                .removeClass("hidden");
            errorSuggestHelper(loadURL);
        }
    };

    // load a dataset
    DataPreview.load = function() {
        var loadURL = $("#filePath").val().trim();
        var dsName  = $("#fileName").val().trim();

        loadHelper()
        .then(function() {
            clearAll();
        })
        .fail(function(error) {
            if (error.status != null) {
                clearAll();
            }
        });

        function loadHelper() {
            if (dsFormat === "JSON") {
                return DatastoreForm.load(dsName, "JSON", loadURL,
                                            "", "", false, "", "");
            } else if (dsFormat === "Excel") {
                return DatastoreForm.load(dsName, "Excel", loadURL,
                                            "\t", "\n", hasHeader, "", "");
            } else {
                return DatastoreForm.load(dsName, "CSV", loadURL,
                                            delimiter, "\n", hasHeader, "", "");
            }
        }
    };

    DataPreview.clear = function() {
        if ($("#dsPreviewWrap").hasClass("hidden")) {
            // when preview table not shows up
            return promiseWrapper(null);
        } else {
            var previewMode = true;
            return clearAll(previewMode);
        }
    };

    function clearAll(previewMode) {
        var deferred = jQuery.Deferred();

        if (!previewMode) {
            $("#dsPreviewWrap").addClass("hidden").addClass("fullSize");
            $("#importDataForm").removeClass("previewMode");
            $previewTable.removeClass("has-delimiter").empty();
        }

        $(window).off("resize", resizePreivewTable);
        $("#importDataForm").off("keypress.preview");

        rawData = null;
        hasHeader = false;
        delimiter = "";
        dsFormat = "CSV";
        highlighter = "";
        toggleHighLight();

        if (tableName != null) {
            var sqlOptions = {
                "operation": SQLOps.DestroyPreviewDS,
                "dsName"   : tableName
            };

            XcalarDestroyDataset(tableName, sqlOptions)
            .then(function() {
                tableName = null;
                deferred.resolve();
            })
            .fail(deferred.reject);
        } else {
            deferred.resolve();
        }

        return (deferred.promise());
    }

    function toggleMinimize(toMinize) {
        if (toMinize == null) {
            toMinize = $previeWrap.hasClass("fullSize");
        }

        if (toMinize) {
            $previeWrap.removeClass("fullSize");
        } else {
            $previeWrap.addClass("fullSize");
        }
    }

    function applyPreviewChange() {
        var $fileName = $("#fileName");
        var isValid = xcHelper.validate([
            // check for "" should be kept for preview mode
            // since it does't submit the form
            {
                "$selector": $fileName,
                "formMode" : true
            },
            {
                "$selector": $fileName,
                "check"    : DS.has,
                "formMode" : true,
                "text"     : ErrorTextTStr.DSNameConfilct
            }
        ]);

        if (!isValid) {
            toggleMinimize(true);
            return;
        }

        // add alert
        if (dsFormat === "CSV" &&
            (delimiter === "" || !hasHeader))
        {
            var msg;
            if (delimiter === "" && !hasHeader) {
                msg = "You have not chosen a delimiter and " +
                        "header row.\n";
            } else if (delimiter === ""){
                msg = "You have not chosen a delimiter.\n";
            } else if (!hasHeader) {
                msg = "You have not chosen a header row.\n";
            }
            msg += ErrorTextTStr.ContinueVerification;

            Alert.show({
                "title"  : "LOAD DATASET CONFIRMATION",
                "msg"    : msg,
                "confirm": function () {
                    DataPreview.load();
                }
            });
        } else {
            DataPreview.load();
        }
    }

    function getPreviewTable() {
        var $tbody = $(getTbodyHTML());
        var $trs = $tbody.find("tr");
        var maxTdLen = 0;
        // find the length of td and fill up empty space
        $trs.each(function() {
            maxTdLen = Math.max(maxTdLen, $(this).find("td").length);
        });

        $trs.each(function() {
            var $tr  = $(this);
            var $tds = $tr.find("td");
            var trs = "";

            for (var j = 0, l = maxTdLen - $tds.length; j < l; j++) {
                trs += "<td></td>";
            }

            $tr.append(trs);
        });

        var $tHead = $(getTheadHTML(maxTdLen));
        var $tHrow = $tHead.find("tr");
        var thLen  = $tHead.find("th").length;
        var ths = "";

        for (var i = 0, len = maxTdLen - thLen; i < len; i++) {
            ths += '<th><div class="header"><div class="text">' +
                        '</div></div></th>';
        }
        $tHrow.append(ths);

        // add class
        $tHrow.find("th").each(function(index) {
            $(this).addClass("col" + index);
        });

        $previewTable.empty().append($tHead, $tbody);
        $previewTable.closest(".datasetTbodyWrap").scrollTop(0);

        if (delimiter !== "") {
            $previewTable.addClass("has-delimiter");
        } else {
            $previewTable.removeClass("has-delimiter");
        }

        suggestHelper();
        resizePreivewTable();
    }

    function resizePreivewTable() {
        // size line divider to fit table
        var tableWidth = $previewTable.width();
        $previewTable.find('.divider').width(tableWidth - 10);

        // // size linmarker div to fit td
        // var lineMarkerHeight = $previewTable.find('.lineMarker').eq(0).height();
        // $previewTable.find('.lineMarker').eq(0).find('.promoteWrap')
        //                                        .height(lineMarkerHeight);
    }

    function togglePromote() {
        $(".tooltip").hide();
        hasHeader = !hasHeader;

        var $trs = $previewTable.find("tbody tr");
        var $tds = $trs.eq(0).find("td"); // first row tds
        var $headers = $previewTable.find("thead tr .header");
        var html;

        if (hasHeader) {
            // promote header
            for (var i = 1, len = $tds.length; i < len; i++) {
                $headers.eq(i).find(".text").html($tds.eq(i).html());
            }

            // change line marker
            for (var i = 1, len = $trs.length; i < len; i++) {
                $trs.eq(i).find(".lineMarker").text(i);
            }

            $trs.eq(0).remove();
            $previewTable.find("th.col0").html(promoteHeader)
                        .addClass("undo-promote");
        } else {
            // change line marker
            for (var i = 0, j = 2, len = $trs.length; i < len; i++, j++) {
                $trs.eq(i).find(".lineMarker").text(j);
            }

            // undo promote
            html = '<tr>' + promoteTd;

            for (var i = 1, len = $headers.length; i < len; i++) {
                var $text = $headers.eq(i).find(".text");
                html += '<td class="cell">' + $text.html() + '</td>';
                $text.html("Column" + (i - 1));
            }

            html += '</tr>';

            $trs.eq(0).before(html);
            $headers.eq(0).empty()
                    .closest("th").removeClass("undo-promote");
        }

        suggestHelper();
        resizePreivewTable();
    }

    function highlightDelimiter(str) {
        highlighter = str;
        xcHelper.removeSelectionRange();
        toggleHighLight();
    }

    function toggleHighLight() {
        $previewTable.find(".highlight").removeClass("highlight");

        var $highLightBtn    = $("#preview-highlight");
        var $rmHightLightBtn = $("#preview-rmHightlight");

        if (highlighter === "") {
            // when remove highlight
            $highLightBtn.removeClass("active");
            $rmHightLightBtn.removeClass("active");
        } else {
            // valid highLighted char
            $highLightBtn.addClass("active");
            $rmHightLightBtn.addClass("active");

            var dels   = highlighter.split("");
            var delLen = dels.length;

            var $cells = $previewTable.find("thead .text, tbody .cell");
            $cells.each(function() {
                var $tds = $(this).find(".td");
                var len = $tds.length;

                for (var i = 0; i < len; i++) {
                    var j = 0;
                    while (j < delLen && i + j < len) {
                        if ($tds.eq(i + j).text() === dels[j]) {
                            ++j;
                        } else {
                            break;
                        }
                    }

                    if (j === delLen && i + j <= len) {
                        for (j = 0; j < delLen; j++) {
                            $tds.eq(i + j).addClass("highlight");
                        }
                    }
                }
            });
        }

        suggestHelper();
    }

    function getTheadHTML(tdLen) {
        var thead = "<thead><tr>";
        var colGrab = (delimiter === "") ? "" : '<div class="colGrab" ' +
                                            'data-sizetoheader="true"></div>';

        if (hasHeader) {
            thead +=
                '<th class="undo-promote">' +
                    promoteHeader +
                '</th>' +
                tdHelper(rawData[0], true);
        } else {
            thead +=
               '<th>' +
                    '<div class="header"></div>' +
                '</th>';

            for (var i = 0; i < tdLen - 1; i++) {
                thead +=
                    '<th>' +
                        '<div class="header">' +
                            colGrab +
                            '<div class="text">Column' + i + '</div>' +
                        '</div>' +
                    '</th>';
            }
        }

        thead += "</thead></tr>";

        return (thead);
    }

    function getTbodyHTML() {
        var tbody = "<tbody>";
        var i  = hasHeader ? 1 : 0;

        for (j = 0, len = rawData.length; i < len; i++, j++) {
            tbody += '<tr>';

            if (i === 0) {
                // when the header has not promoted
                tbody += promoteTd;
            } else {
                tbody +=
                    '<td class="lineMarker">' +
                        (j + 1) +
                    '</td>';
            }

            tbody += tdHelper(rawData[i]) + '</tr>';
        }

        tbody += "</tbody>";

        return (tbody);
    }

    function tdHelper(data, isTh) {
        var hasQuote = false;
        var hasBackSlash = false;
        var dels = delimiter.split("");
        var delLen = dels.length;

        var hasDelimiter = (delLen !== 0);
        var colGrab = hasDelimiter ? '<div class="colGrab" ' +
                                     'data-sizetoheader="true"></div>' : "";
        var html = isTh ? '<th><div class="header">' + colGrab +
                            '<div class="text cell">'
                            : '<td class="cell">';

        var dataLen = data.length;
        var i = 0;

        if (hasDelimiter) {
            // when has deliliter
            while (i < dataLen) {
                var d = data[i];
                var isDelimiter = false;

                if (!hasBackSlash && !hasQuote && d === dels[0]) {
                    isDelimiter = true;

                    for (var j = 1; j < delLen; j++) {
                        if (i + j >= dataLen || data[i + j] !== dels[j]) {
                            isDelimiter = false;
                            break;
                        }
                    }
                }

                if (isDelimiter) {
                    // skip delimiter
                    if (isTh) {
                        html += '</div></div></th>' +
                                '<th>' +
                                    '<div class="header">' +
                                        colGrab +
                                        '<div class="text">';
                    } else {
                        html += '</td><td>';
                    }

                    i = i + delLen;
                } else {
                    if (hasBackSlash) {
                        // when previous char is \. espace this one
                        hasBackSlash = false;
                    } else if (d === '\\') {
                        hasBackSlash = true;
                    } else if (d === '"') {
                        // toggle escape of quote
                        hasQuote = !hasQuote;
                    }

                    html += d;
                    ++i;
                }
            }
        } else {
            // when not apply delimiter
            for (i = 0; i < dataLen; i++) {
                d = data[i];

                var cellClass = "td";
                if (d === "\t") {
                    cellClass += " has-margin has-tab";
                } else if (d === ",") {
                    cellClass += " has-margin has-comma";
                } else if (d === "|") {
                    cellClass += " has-pipe";
                }
                html += '<span class="' + cellClass + '">' + d + '</span>';
            }
        }

        if (isTh) {
            html += '</div></div></th>';
        } else {
            html += '</td>';
        }

        return (html);
    }

    function suggestHelper() {
        var $suggSection = $("#previewSugg");
        var $content = $suggSection.find(".content");
        var html = "";

        if (delimiter === "") {
            if (highlighter === "") {
                var $cells = $previewTable.find("tbody tr:first-child .td");
                if ($cells.length === 1 && $cells.text() === "[") {
                    html = '<span class="action active jsonLoad">' +
                                'Load as JSON dataset' +
                            '</span>';
                    $content.html(html);
                    return;
                }
                // case to choose a highlighter
                var commaLen = $previewTable.find(".has-comma").length;
                var tabLen   = $previewTable.find(".has-tab").length;
                var commaHtml =
                    '<span class="action active commaDelim">' +
                        'Apply comma as delimiter' +
                    '</span>';
                var tabHtml =
                    '<span class="action active tabDelim">' +
                        'Apply tab as delimiter' +
                    '</span>';

                if (commaLen > 0 && tabLen > 0) {
                    if (commaLen >= tabLen) {
                        html = commaHtml + tabHtml;
                    } else {
                        html = tabHtml + commaHtml;
                    }
                } else {
                    // one of comma and tab or both are 0
                    if (commaLen > 0) {
                        html = commaHtml;
                    } else if (tabLen > 0) {
                        html = tabHtml;
                    } else {
                        // both comma and tab are zero
                        if ($previewTable.find(".has-pipe").length >= rowsToFetch) {
                            // at least each row has pipe
                            html =
                                '<span class="action active pipeDelim">' +
                                    'Apply pipe as delimiter' +
                                '</span>';
                        }
                    }
                }

                if (html === "") {
                    // select char
                    html =
                        '<span class="action hint">' +
                            'Highlight a character as delimiter' +
                        '</span>';
                } else {
                    // select another char
                    html +=
                        '<span class="action hint">' +
                            'or Highlight another character as delimiter' +
                        '</span>';
                }
            } else {
                // case to remove or apply highlighter
                html =
                    '<span class="action active apply-highlight">' +
                        'Apply hightlighted characters as delimiter' +
                    '</span>' +
                    '<span class="action active rm-highlight">' +
                        'Remove Highlights' +
                    '</span>';
            }
        } else {
            var shouldPromote = headerPromoteDetect();
            // case to apply/replay delimiter promote/unpromote header
            if (hasHeader) {
                if (!shouldPromote) {
                    html +=
                        '<span class="action active promote">' +
                            'Undo promote header' +
                        '</span>';
                }
            } else {
                if (shouldPromote) {
                    html +=
                        '<span class="action active promote">' +
                            'Promote first row as header' +
                        '</span>';
                }
            }

            html +=
                '<span class="action active apply-all">' +
                    'Apply changes' +
                '</span>';

            html +=
                '<span class="action active rm-highlight">' +
                    'Remove Delimiter' +
                '</span>';
        }

        $content.html(html);
    }

    function errorSuggestHelper(loadURL) {
        var $suggSection = $("#previewSugg");
        var html = "";

        if (loadURL.endsWith("xlsx")) {
            html += '<span class="action active excelLoad hasHeader">' +
                        'Load as EXCEL dataset and promote header' +
                    '</span>' +
                    '<span class="action active excelLoad">' +
                        'Load as EXCEL dataset' +
                    '</span>';
        } else {
            html += '<span class="action hint">' +
                        'Use UDF to parse the dataset' +
                    '</span>';
        }

        $suggSection.show()
                    .find(".content").html(html);
    }

    function headerPromoteDetect() {
        if (delimiter === "") {
            // has not specified delimiter
            // not recommend to promote
            return false;
        }

        var col;
        var row;
        var $trs = $previewTable.find("tbody tr");
        var rowLen = $trs.length;
        var headers = [];
        var text;
        var $headers = hasHeader ? $previewTable.find("thead tr .header") :
                                    $trs.eq(0).children();
        var colLen = $headers.length;
        var score = 0;

        for (col = 1; col < colLen; col++) {
            text = hasHeader ? $headers.eq(col).find(".text").text() :
                                $headers.eq(col).text();
            if ($.isNumeric(text)) {
                // if row has number
                // should not be header
                return false;
            } else if (text === "" || text == null) {
                // ds may have case to have empty header
                score -= 100;

            }

            headers[col] = text;
        }

        var tds = [];
        var rowStart = hasHeader ? 0 : 1;

        for (row = rowStart; row < rowLen; row++) {
            tds[row] = [];
            $tds = $trs.eq(row).children();
            for (col = 1; col < colLen; col++) {
                tds[row][col] = $tds.eq(col).text();
            }
        }

        for (col = 1; col < colLen; col++) {
            text = headers[col];
            var textLen = text.length;

            for (row = rowStart; row < rowLen; row++) {
                var tdText = tds[row][col];
                if ($.isNumeric(tdText)) {
                    // header is string and td is number
                    // valid this td
                    score += 30;
                } else if (tdText === "" || tdText == null) {
                    // td is null but header is not
                    score += 10;
                } else {
                    // the diff btw header and td is bigger, better
                    var diff = Math.abs(textLen - tdText.length);
                    if (diff === 0 && text === tdText) {
                        score -= 20;
                    } else {
                        score += diff;
                    }
                }
            }
        }

        if (rowLen === 0 || score / rowLen < 20) {
            return false;
        } else {
            return true;
        }
    }

    return (DataPreview);
}(jQuery, {}));
