/*
 * Module for preview table
 */
window.DataPreview = (function($, DataPreview) {
    var $previeWrap = $("#dsPreviewWrap");
    var $previewTable = $("#previewTable");
    var $highLightBtn = $("#preview-highlight");
    var $rmHightLightBtn = $("#preview-rmHightlight");

    var tableName = null;
    var rawData   = null;

    var hasHeader   = false;
    var delimiter   = "";
    var highlighter = "";
    var dsFormat    = "CSV";
    var moduleName  = "";
    var funcName    = "";

    // constant
    var rowsToFetch = 40;

    var promoteHeader =
            '<div class="header" ' +
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

            applyHighlight(selection.toString());
        });

        $("#preview-apply").click(applyPreviewChange);

        $("#preview-minimize").click(function() {
            $(".tooltip").hide();
            toggleMinimize();
        });

        // close preview
        $("#preview-close").click(function() {
            clearAll();
        });

        // hightlight and remove highlight button
        $highLightBtn.click(function() {
            if (!$highLightBtn.hasClass("active") || highlighter === "") {
                return;
            }
            applyDelim(highlighter);
        });

        $rmHightLightBtn.click(function() {
            if (!$rmHightLightBtn.hasClass("active") || delimiter !== "") {
                // case of remove delimiter
                applyDelim("");
            } else {
                // case of remove highlighter
                applyHighlight("");
            }
        });

        // resize column
        $previewTable.on("mousedown", ".colGrab", function(event) {
            if (event.which !== 1) {
                return;
            }
            TblAnim.startColResize($(this), event, {target: "datastore"});
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
            applyDelim(",");
        });

        $suggSection.on("click", ".tabDelim", function() {
            applyDelim("\t");
        });

        $suggSection.on("click", ".pipeDelim", function() {
            applyDelim("|");
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
    };

    DataPreview.show = function(udfModule, udfFunc) {
        var deferred = jQuery.Deferred();
        var loadURL = $("#filePath").val().trim();
        var refId;
        var $waitSection;
        var $errorSection;

        if (udfModule != null && udfFunc != null &&
            udfModule !== "" && udfFunc !== "") {
            moduleName = udfModule;
            funcName = udfFunc;
            $("#preview-udf").show()
                             .find(".text").text(moduleName + ":" + funcName);
        } else if (udfModule === "" && udfFunc === "" ||
                   udfModule == null && udfFunc == null) {
            moduleName = "";
            funcName = "";
            $("#preview-udf").hide()
                             .find(".text").text("");
        } else {
            // when udf module == null or udf func == null
            // it's an error case
            return deferred.reject("Error Case!").promise();
        }

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

            $waitSection = $previeWrap.find(".waitSection")
                                        .removeClass("hidden");
            $errorSection = $previeWrap.find(".errorSection")
                                        .addClass("hidden");

            tableName = getPreviewTableName();

            var sql = {
                "operation" : SQLOps.PreviewDS,
                "dsPath"    : loadURL,
                "dsName"    : tableName,
                "dsFormat"  : "raw",
                "hasHeader" : hasHeader,
                "fieldDelim": "Null",
                "lineDelim" : "\n",
                "moduleName": moduleName,
                "funcName"  : funcName
            };
            var txId = Transaction.start({
                "operation": SQLOps.PreviewDS,
                "sql"      : sql
            });

            showPreviewPanel()
            .then(function() {
                return XcalarLoad(loadURL, "raw", tableName, "", "\n",
                                hasHeader, moduleName, funcName, txId);
            })
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
                    deferred.reject({"error": DSTStr.NoParse});
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
                        $previeWrap.addClass("fullSize");
                    } else {
                        $loadHiddenSection.fadeIn(500, function() {
                            $previeWrap.addClass("fullSize");
                        });
                    }

                    getPreviewTable();
                    deferred.resolve();
                } catch(err) {
                    console.error(err, value);
                    cannotParseHandler();
                    deferred.reject({"error": DSTStr.NoParse});
                }

                $(window).on("resize", resizePreivewTable);

                // not cache to sql log, only show when fail
                Transaction.done(txId, {
                    "noCommit": true,
                    "noSql"   : true
                });
            })
            .fail(function(error) {
                $waitSection.addClass("hidden");
                clearAll();
                StatusBox.show(error.error, $("#filePath"), true);

                Transaction.fail(txId, {
                    "error"  : error,
                    "noAlert": true
                });
                deferred.reject(error);
            });
        })
        .fail(function(error) {
            StatusBox.show(error.error, $("#filePath"), true);
            deferred.reject(error);
        });

        return (deferred.promise());

        function cannotParseHandler() {
            $errorSection.html(DSTStr.NoParse).removeClass("hidden");
            errorSuggestHelper(loadURL);
            $("#preview-close").show();
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
                // only CSV should apply module and funcName
                return DatastoreForm.load(dsName, "CSV", loadURL,
                                          delimiter, "\n", hasHeader,
                                          moduleName, funcName);
            }
        }
    };

    DataPreview.clear = function() {
        if ($previeWrap.hasClass("hidden")) {
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
            $previeWrap.addClass("hidden").removeClass("fullSize");
            $("#importDataForm").removeClass("previewMode");
            $previewTable.removeClass("has-delimiter").empty();
        }

        $(window).off("resize", resizePreivewTable);
        $("#importDataForm").off("keypress.preview");

        rawData = null;
        hasHeader = false;
        delimiter = "";
        dsFormat = "CSV";
        moduleName = "";
        funcName = "";
        applyHighlight(""); // remove highlighter

        if (tableName != null) {
            var sql = {
                "operation": SQLOps.DestroyPreviewDS,
                "dsName"   : tableName
            };
            var txId = Transaction.start({
                "operation": SQLOps.DestroyPreviewDS,
                "sql"      : sql
            });

            XcalarDestroyDataset(tableName, txId)
            .then(function() {
                tableName = null;
                Transaction.done(txId, {
                    "noCommit": true,
                    "noSql"   : true
                });
                deferred.resolve();
            })
            .fail(function(error) {
                Transaction.fail(txId, {
                    "error"  : error,
                    "noAlert": true
                });
                deferred.reject(error);
            });
        } else {
            deferred.resolve();
        }

        return (deferred.promise());
    }

    function showPreviewPanel() {
        var deferred = jQuery.Deferred();
        // move the panel to bottom before display
        $previeWrap.addClass("smallSize");
        $previeWrap.removeClass("hidden");
        if (gMinModeOn) {
            $previeWrap.removeClass("smallSize");
            deferred.resolve();
        } else {
            setTimeout(function() {
                // without this setTimeout, previewWrap with go from top: 100%
                // to top: 244px without animation
                $previeWrap.removeClass("smallSize");

                setTimeout(function() {
                    // this setTimout it for the anmtion time btw
                    // top: 100% to top: 244%
                    deferred.resolve();
                }, 700);
            }, 100);
        }

        return deferred.promise();
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
                "text"     : ErrTStr.DSNameConfilct
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
                msg = DSPreviewTStr.NoDelimAndHeader;
            } else if (delimiter === ""){
                msg = DSPreviewTStr.NoDelim;
            } else if (!hasHeader) {
                msg = DSPreviewTStr.NoHeader;
            }
            msg += '\n' + AlertTStr.ContinueConfirm;

            Alert.show({
                "title"  : DSFormTStr.LoadConfirm,
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
        var $tbody = $(getTbodyHTML(rawData));
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

        var $tHead = $(getTheadHTML(rawData, maxTdLen));
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

    function applyDelim(strToDelimit) {
        delimiter = strToDelimit;
        highlighter = "";

        $highLightBtn.removeClass("active");

        if (delimiter === "") {
            // this is the case trigger from remove delimiter
            $rmHightLightBtn.removeClass("active")
                        .attr("title", DSPreviewTStr.RMHighlights)
                        .attr("data-original-title", DSPreviewTStr.RMHighlights);
        } else {
            $rmHightLightBtn.addClass("active")
                        .attr("title", DSPreviewTStr.RMDelim)
                        .attr("data-original-title", DSPreviewTStr.RMDelim);
        }
        getPreviewTable();
    }

    function applyHighlight(str) {
        $previewTable.find(".highlight").removeClass("highlight");

        highlighter = str;

        if (highlighter === "") {
            // when no delimiter to highlight
            $highLightBtn.removeClass("active");
            $rmHightLightBtn.removeClass("active");
        } else {
            xcHelper.removeSelectionRange();

            // when has valid delimiter to highlight
            $highLightBtn.addClass("active");
            $rmHightLightBtn.addClass("active");

            var $cells = $previewTable.find("thead .text, tbody .cell");
            highlightHelper($cells, highlighter);
        }

        suggestHelper();
    }

    function highlightHelper($cells, strToHighlight) {
        var dels = strToHighlight.split("");
        var delLen = dels.length;

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

    function getPreviewTableName() {
        var name = $("#fileName").val().trim();
        name = xcHelper.wrapDSName(name);
        name = xcHelper.randName(name) ||   // when table name is empty
                    xcHelper.randName("previewTable");
        name += ".preview"; // specific format for preview table
        return name;
    }

    function getTheadHTML(datas, tdLen) {
        var thead = "<thead><tr>";
        var colGrab = (delimiter === "") ? "" : '<div class="colGrab" ' +
                                            'data-sizetoheader="true"></div>';

        // when has header
        if (hasHeader) {
            thead +=
                '<th class="undo-promote">' +
                    promoteHeader +
                '</th>' +
                parseTdHelper(datas[0], delimiter, true);
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

        thead += "</tr></thead>";

        return (thead);
    }

    function getTbodyHTML(datas) {
        var tbody = "<tbody>";
        var i = hasHeader ? 1 : 0;

        for (j = 0, len = datas.length; i < len; i++, j++) {
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

            tbody += parseTdHelper(datas[i], delimiter) + '</tr>';
        }

        tbody += "</tbody>";

        return (tbody);
    }

    function parseTdHelper(data, strToDelimit, isTh) {
        var hasQuote = false;
        var hasBackSlash = false;
        var dels = strToDelimit.split("");
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
                                        '<div class="text cell">';
                    } else {
                        html += '</td><td class="cell">';
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
                                DSPreviewTStr.LoadJSON +
                            '</span>';
                    $content.html(html);
                    return;
                }
                // case to choose a highlighter
                var commaLen = $previewTable.find(".has-comma").length;
                var tabLen   = $previewTable.find(".has-tab").length;
                var commaHtml =
                    '<span class="action active commaDelim">' +
                        DSPreviewTStr.CommaAsDelim +
                    '</span>';
                var tabHtml =
                    '<span class="action active tabDelim">' +
                        DSPreviewTStr.TabAsDelim +
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
                    }
                }

                // when has pip
                var pipLen = $previewTable.find(".has-pipe").length;
                if (pipLen >= rowsToFetch) {
                    var pipHtml = '<span class="action active pipeDelim">' +
                                    DSPreviewTStr.PipeAsDelim +
                                  '</span>';

                    if (pipLen > commaLen && pipLen > tabLen) {
                        html = pipHtml + html;
                    } else {
                        html = html + pipHtml;
                    }
                }

                if (html === "") {
                    // select char
                    html =
                        '<span class="action hint">' +
                            DSPreviewTStr.HighlightDelimHint +
                        '</span>';
                } else {
                    // select another char
                    html +=
                        '<span class="action hint">' +
                            DSPreviewTStr.Or + " " +
                            DSPreviewTStr.HighlightAnyDelimHint +
                        '</span>';
                }
            } else {
                // case to remove or apply highlighter
                html =
                    '<span class="action active apply-highlight">' +
                        DSPreviewTStr.ApplyHighlights +
                    '</span>' +
                    '<span class="action active rm-highlight">' +
                        DSPreviewTStr.RMHighlights +
                    '</span>';
            }
        } else {
            var shouldPromote = headerPromoteDetect();
            // case to apply/replay delimiter promote/unpromote header
            if (hasHeader) {
                if (!shouldPromote) {
                    html +=
                        '<span class="action active promote">' +
                            DSPreviewTStr.UnPromote +
                        '</span>';
                }
            } else {
                if (shouldPromote) {
                    html +=
                        '<span class="action active promote">' +
                            DSPreviewTStr.Promote +
                        '</span>';
                }
            }

            html +=
                '<span class="action active apply-all">' +
                    DSPreviewTStr.Save +
                '</span>';

            html +=
                '<span class="action active rm-highlight">' +
                    DSPreviewTStr.RMDelim +
                '</span>';
        }

        $content.html(html);
    }

    function errorSuggestHelper(loadURL) {
        var $suggSection = $("#previewSugg");
        var html = "";

        if (loadURL.endsWith("xlsx")) {
            html += '<span class="action active excelLoad hasHeader">' +
                        DSPreviewTStr.LoadExcelWithHeader +
                    '</span>' +
                    '<span class="action active excelLoad">' +
                        DSPreviewTStr.LoadExcel +
                    '</span>';
        } else if (loadURL.endsWith("json")) {
            html += '<span class="action active jsonLoad">' +
                        DSPreviewTStr.LoadJSON +
                    '</span>';
        } else {
            html += '<span class="action hint">' +
                        DSPreviewTStr.LoadUDF +
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

    /* Unit Test Only */
    if (window.unitTestMode) {
        DataPreview.__testOnly__ = {};
        DataPreview.__testOnly__.getPreviewTable = getPreviewTable;
        DataPreview.__testOnly__.parseTdHelper = parseTdHelper;
        DataPreview.__testOnly__.getTbodyHTML = getTbodyHTML;
        DataPreview.__testOnly__.getTheadHTML = getTheadHTML;
        DataPreview.__testOnly__.highlightHelper = highlightHelper;
        DataPreview.__testOnly__.suggestHelper = suggestHelper;
        DataPreview.__testOnly__.errorSuggestHelper = errorSuggestHelper;
        DataPreview.__testOnly__.headerPromoteDetect = headerPromoteDetect;
        DataPreview.__testOnly__.applyHighlight = applyHighlight;
        DataPreview.__testOnly__.applyDelim = applyDelim;
        DataPreview.__testOnly__.togglePromote = togglePromote;
        DataPreview.__testOnly__.toggleMinimize = toggleMinimize;
        DataPreview.__testOnly__.clearAll = clearAll;

        DataPreview.__testOnly__.get = function() {
            return {
                "delimiter"  : delimiter,
                "hasHeader"  : hasHeader,
                "highlighter": highlighter
            };
        };

        DataPreview.__testOnly__.set = function(newDelim, newHeader, newHighlight, newData) {
            delimiter = newDelim || "";
            hasHeader = newHeader || false;
            highlighter = newHighlight || "";
            rawData = newData || null;
        };
    }
    /* End Of Unit Test Only */

    return (DataPreview);
}(jQuery, {}));
