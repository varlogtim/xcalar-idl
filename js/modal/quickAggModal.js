window.AggModal = (function($, AggModal) {
    var $modalBackground = $("#modalBackground");
    var $aggModal = $("#quickAggDialog");

    var $aggSelect    = $("#aggOp");
    var $aggDropdown  = $("#aggOpSelect");
    var $aggTableName = $("#aggRoundedInput");

    var aggrFunctions = [AggrOp.Sum, AggrOp.Avg, AggrOp.Min,
                        AggrOp.Max, AggrOp.Count];

    var aggCols = [];
    // UI cahce, not save to KVStore
    var aggCache  = {};
    var corrCache = {};
    var aggOpMap  = {};

    var minWidth  = 580;
    var minHeight = 300;
    var modalHelper = new xcHelper.Modal($aggModal, {
        "minWidth" : minWidth,
        "minHeight": minHeight
    });

    AggModal.setup = function() {
        aggOpMap[AggrOp.Sum] = 0;
        aggOpMap[AggrOp.Avg] = 1;
        aggOpMap[AggrOp.Min] = 2;
        aggOpMap[AggrOp.Max] = 3;
        aggOpMap[AggrOp.Count] = 4;

        $("#closeAgg").click(function() {
            resetAggTables();
        });

        $aggSelect.click(function(event) {
            event.stopPropagation();

            $aggSelect.toggleClass("open");
            $aggDropdown.toggle();
        });

        $aggDropdown.on("click", "li", function(event) {
            var $li  = $(this);

            event.stopPropagation();

            if ($li.hasClass("inactive")) {
                return;
            }

            var aggOp = $li.text();

            $aggSelect.find(".text").text(aggOp);

            if (aggOp === "Aggregate Functions") {
                $("#mainAgg1").show();
                $("#mainAgg2").hide();
            } else if (aggOp === "Correlation Coefficient") {
                $("#mainAgg1").hide();
                $("#mainAgg2").show();
            }

            hideAggOpSelect();
        });

        $aggModal.click(hideAggOpSelect);
        $aggTableName.val("tempTableName");
        
        $aggModal.draggable({
            handle     : '.modalHeader',
            cursor     : '-webkit-grabbing',
            containment: 'window'
        });

        $aggModal.resizable({
            handles    : "e, w",
            minHeight  : minHeight,
            minWidth   : minWidth,
            containment: "document"
        });

        var $mainAgg1 = $("#mainAgg2");
        $mainAgg1.find(".aggContainer").scroll(function() {
            var scrollTop = $(this).scrollTop();
            $mainAgg1.find(".labelContainer").scrollTop(scrollTop);
        });

        var $mainAgg2 = $("#mainAgg2");
        $mainAgg2.find(".aggContainer").scroll(function() {
            var scrollTop = $(this).scrollTop();
            $mainAgg2.find(".labelContainer").scrollTop(scrollTop);
        });

        $aggModal.on("mouseenter", ".tooltipOverflow", function() {
            xcHelper.autoTooltip(this);
        });
    };

    AggModal.show = function(tableId, type) {
        var deferred = jQuery.Deferred();

        $modalBackground.on("click", hideAggOpSelect);

        var table     = gTables[tableId];
        var tableName = table.tableName;
        var $table    = $("xcTable-" + tableId);

        $aggTableName.val(tableName);
        modalHelper.setup();

        if (gMinModeOn) {
            $modalBackground.show();
            $aggModal.show();
            showHandler();
        } else {
            $modalBackground.fadeIn(300, function() {
                $aggModal.fadeIn(180);
                showHandler();
            });
        }

        aggColsInitialize(table);
        aggTableInitialize($table);
        corrTableInitialize($table);

        if (type === 'aggregates') {
            $aggDropdown.find('li').filter(function() {
                return ($(this).text() === "Aggregate Functions");
            }).click();
        } else if (type === 'correlation') {
            $aggDropdown.find('li').filter(function() {
                return ($(this).text() === "Correlation Coefficient");
            }).click();
        }

        var def1 = calcAgg($table, tableName, tableId);
        var def2 = calcCorr($table, tableName, tableId);

        xcHelper.when(def1, def2)
        .then(function() {
            SQL.add("Quick Aggregate", {
                "operation": SQLOps.QuickAgg,
                "tableId"  : tableId,
                "tableName": tableName,
                "type"     : type
            });

            commitToStorage();
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error("Quick Aggregate Fails", error);
            deferred.reject(error);
        });

        return (deferred.promise());

        function showHandler() {
            Tips.refresh();
            $aggModal.find(".aggContainer")
                    .scrollTop(0)
                    .scrollLeft(0);
        }
    };

    // XXX just for debug use, should delete it later!
    // Not safe as it's an obj, value could change.
    AggModal.getAggCache = function() {
        return (aggCache);
    };

    // XXX just for debug use, should delete it later!
    // Not safe as it's an obj, value could change.
    AggModal.getCorrCache = function() {
        return (corrCache);
    };

    function aggColsInitialize(table) {
        aggCols = [];

        var tableCols = table.tableCols;

        for (var i = 0, colLen = tableCols.length; i < colLen; i++) {
            // Skip DATA!
            if (tableCols[i].name === "DATA") {
                continue;
            } else {
                aggCols.push({
                    "colNum": i + 1,
                    "col"   : tableCols[i]
                });
            }
        }
    }

    function aggTableInitialize($table) {
        var $mainAgg1 = $("#mainAgg1");

        var colLen = aggCols.length;
        var funLen = aggrFunctions.length;

        var wholeTable = '';

        for (var j = 0; j < colLen; j++) {
            var cols   = aggCols[j].col;
            var colNum = aggCols[j].colNum;

            wholeTable += '<div class="aggCol">' +
                            '<div class="divider"></div>' +
                            '<div class="aggTableField colLabel">' +
                                '<span class="textOverflow">' +
                                    cols.name +
                                '</span>' +
                            '</div>';

            var isChildOfArray = $table.find(".th.col" + colNum + " .header")
                                        .hasClass("childOfArray");

            for (var i = 0; i < funLen; i++) {
                wholeTable += '<div class="aggTableField">';

                if (cols.type === "integer" || cols.type === "float") {
                    // XXX now agg on child of array is not supported
                    if (isChildOfArray) {
                        wholeTable += "Not Supported";
                    } else {
                        wholeTable += '<div class="spinny"></div>';
                    }
                } else {
                    wholeTable += "N/A";
                }

                wholeTable += "</div>";
            }

            wholeTable += "</div>";
        }

        $mainAgg1.find(".labelContainer").html(getRowLabelHTML(aggrFunctions));
        $mainAgg1.find(".aggContainer").html(wholeTable);
    }

    function corrTableInitialize($table) {
        var $mainAgg2 = $("#mainAgg2");

        var colLen = aggCols.length;

        var wholeTable = '';

        for (var j = 0; j < colLen; j++) {
            var cols   = aggCols[j].col;
            var colNum = aggCols[j].colNum;

            wholeTable += '<div class="aggCol">' +
                            '<div class="divider"></div>' +
                            '<div class="aggTableField colLabel">' +
                                '<span class="textOverflow">' +
                                    cols.name +
                                '</span>' +
                            '</div>';
            var isChildOfArray = $table.find(".th.col" + colNum + " .header")
                                        .hasClass("childOfArray");

            for (var i = 0; i < colLen; i++) {
                var vertCols = aggCols[i].col;
                var whiteBackground =
                            "style='background-color:rgb(255,255,255)'";
                var backgroundOpacity =
                                    "style='background-color:rgba(66,158,212,";
                wholeTable += '<div class="aggTableField aggTableFlex" ';

                if (i === j) {
                    wholeTable += ">1";
                } else if (i > j) {
                    wholeTable += whiteBackground;
                    wholeTable += ">See other";
                } else if ((cols.type === "integer" || cols.type === "float")
                           && (vertCols.type === "integer" ||
                               vertCols.type === "float"))
                {
                    // XXX now agg on child of array is not supported
                    if (isChildOfArray) {
                        wholeTable += whiteBackground;
                        wholeTable += ">Not Supported";
                    } else {
                        wholeTable += backgroundOpacity + "0)'";
                        wholeTable += '><div class="spinner">' +
                                        '<div class="bounce1"></div>' +
                                        '<div class="bounce2"></div>' +
                                        '<div class="bounce3"></div>' +
                                        '</div>';
                    }
                } else {
                    wholeTable += whiteBackground;
                    wholeTable += ">N/A";
                }
                wholeTable += "</div>";
            }
            wholeTable += "</div>";
        }

        var vertLabels = [];
        aggCols.forEach(function(colInfo) {
            vertLabels.push(colInfo.col.name);
        });

        $mainAgg2.find(".labelContainer").html(getRowLabelHTML(vertLabels));
        $mainAgg2.find(".aggContainer").html(wholeTable);
    }

    function getRowLabelHTML(operations) {
        var html =
            '<div class="aggCol labels">' +
                '<div class="aggTableField colLabel blankSpace"></div>';

        for (var i = 0, len = operations.length; i < len; i++) {
            html += '<div class="aggTableField rowLabel">' +
                        operations[i] +
                    '</div>';
        }

        html += '</div>';
        return (html);
    }

    function hideAggOpSelect() {
        $aggDropdown.hide();
        $aggSelect.removeClass('open');
    }


    function calcCorr($table, tableName, tableId) {
        var promises = [];

        var colLen  = aggCols.length;
        var dupCols = [];
        // First we need to determine if this is a dataset-table
        // or just a regular table

        var corrString = "div(sum(mult(sub($arg1, avg($arg1)), sub($arg2," +
                         "avg($arg2)))), sqrt(mult(sum(pow(sub($arg1, " +
                         "avg($arg1)), 2)), sum(pow(sub($arg2, avg($arg2)), " +
                         "2)))))";

        for (var j = 0; j < colLen; j++) {
            var cols   = aggCols[j].col;
            var colNum = aggCols[j].colNum;

            if (cols.type === "integer" || cols.type === "float") {
                // for duplicated columns, no need to trigger thrift call
                if (dupCols[j]) {
                    // console.log("Duplicated column", j);
                    continue;
                }

                var dups = checkDupCols(j);
                for (var t = 0; t < dups.length; t++) {
                    var dupColNum = dups[t];
                    dupCols[dupColNum] = true;
                    if (dupColNum > j) {
                        $("#mainAgg2").find(".aggCol:not(.labels)").eq(dupColNum)
                            .find(".aggTableField:not(.colLabel)").eq(j)
                                .html("1").css("background-color", "");
                    }
                }

                var $colHeader = $table.find(".th.col" + colNum + " .header");
                // XXX now agg on child of array is not supported
                if (!$colHeader.hasClass("childOfArray")) {
                    for (var i = 0; i < j; i++) {
                        if (i === j) {
                            // Must be 1 so skip
                            continue;
                        }
                        var vertCols = aggCols[i].col;
                        if (vertCols.type !== "integer" &&
                            vertCols.type !== "float")
                        {
                            continue;
                        }
                        var sub = corrString.replace(/[$]arg1/g,
                                                     cols.func.args[0]);
                        sub = sub.replace(/[$]arg2/g, vertCols.func.args[0]);
                        // Run correlation function
                        var promise = runCorr(tableId, tableName,
                                                sub, i, j, dups);
                        promises.push(promise);
                    }
                }
            }
        }

        return (xcHelper.when.apply(window, promises));
    }

    function calcAgg($table, tableName, tableId) {
        var promises = [];

        var colLen = aggCols.length;
        var funLen = aggrFunctions.length;
        // First we need to determine if this is a dataset-table
        // or just a regular table
        var dupCols = [];
        for (var j = 0; j < colLen; j++) {
            var cols   = aggCols[j].col;
            var colNum = aggCols[j].colNum;
            // Skip DATA!
            if (cols.type === "integer" || cols.type === "float") {
                // for duplicated columns, no need to trigger thrift call
                if (dupCols[j]) {
                    // console.log("Duplicated column", j);
                    continue;
                }

                var dups = checkDupCols(j);
                for (var t = 0; t < dups.length; t++) {
                    var dupColNum = dups[t];
                    dupCols[dupColNum] = true;
                }

                var $colHeader = $table.find(".th.col" + colNum + " .header");
                // XXX now agg on child of array is not supported
                if (!$colHeader.hasClass("childOfArray")) {
                    for (var i = 0; i < funLen; i++) {
                        var promise = runAgg(tableId, tableName,
                                                cols.func.args[0],
                                                aggrFunctions[i], i, j, dups);
                        promises.push(promise);
                    }
                }
            }
        }

        return (xcHelper.when.apply(window, promises));
    }

    function checkDupCols(colNo) {
        var args = aggCols[colNo].col.func.args[0];
        var dups = [];

        for (var i = colNo + 1, len = aggCols.length; i < len; i++) {
            var cols = aggCols[i].col;
            if (cols.func.args &&
                (cols.func.args[0] === args) &&
                (cols.func.func !== "raw"))
            {
                dups.push(i);
            }
        }
        return (dups);
    }

    function runAgg(tableId, tableName, fieldName, opString, row, col, dups) {
        var deferred = jQuery.Deferred();
        var tableAgg;
        var colAgg;

        if (aggCache.hasOwnProperty(tableId)) {
            tableAgg = aggCache[tableId];
            if (tableAgg.hasOwnProperty(fieldName)) {
                colAgg = tableAgg[fieldName];
                var aggRes = colAgg[aggOpMap[opString]];
                if (aggRes != null) {
                    applyAggResult(aggRes);
                    deferred.resolve();
                    return (deferred.promise());
                }
            }
        }

        var sqlOptions = {
            "operation": SQLOps.QuickAggAction,
            "type"     : "aggreagte",
            "fieldName": fieldName,
            "aggrOp"   : opString
        };

        XcalarAggregate(fieldName, tableName, opString, sqlOptions)
        .then(function(value) {
            var val;

            try {
                var obj = jQuery.parseJSON(value);
                val = obj.Value;
            } catch (error) {
                console.error(error, obj);
                val = "--";
            }

            // cache value
            aggCache[tableId] = aggCache[tableId] || {};
            tableAgg = aggCache[tableId];
            tableAgg[fieldName] = tableAgg[fieldName] || [];
            colAgg = tableAgg[fieldName];
            colAgg[aggOpMap[opString]] = val;
            // end of cache value

            applyAggResult(val);
            deferred.resolve();
        })
        .fail(function(error) {
            applyAggResult("--");
            deferred.reject(error);
        });

        function applyAggResult(value) {
            var html = '<span class="textOverflow tooltipOverflow" ' +
                        'title="' + value +
                        '" data-toggle="tooltip" data-placement="top" ' +
                        'data-container="body">' +
                        (jQuery.isNumeric(value) ? value.toFixed(3) : value) +
                        '</span>';
            $("#mainAgg1").find(".aggCol:not(.labels)").eq(col)
                .find(".aggTableField:not(.colLabel)").eq(row).html(html);

            dups.forEach(function(colNum) {
                $("#mainAgg1").find(".aggCol:not(.labels)").eq(colNum)
                    .find(".aggTableField:not(.colLabel)").eq(row).html(html);
            });
        }

        return (deferred.promise());
    }

    function runCorr(tableId, tableName, evalStr, row, col, colDups) {
        var deferred = jQuery.Deferred();

        if (corrCache.hasOwnProperty(tableId)) {
            var corrRes = corrCache[tableId][evalStr];

            if (corrRes != null) {
                applyCorrResult(corrRes);
                deferred.resolve();
                return (deferred.promise());
            }
        }


        var sqlOptions = {
            "operation": SQLOps.QuickAggAction,
            "type"     : "correlation",
            "evalStr"  : evalStr
        };

        XcalarAggregateHelper(tableName, evalStr, sqlOptions)
        .then(function(value) {
            var val;

            try {
                var obj = jQuery.parseJSON(value);
                val = obj.Value;
            } catch (error) {
                console.error(error, obj);
                val = "--";
            }

            // cache value
            corrCache[tableId] = corrCache[tableId] || {};
            corrCache[tableId][evalStr] = val;
            // end of cache value

            applyCorrResult(val);
            deferred.resolve();
        })
        .fail(function(error) {
            applyCorrResult("--");
            deferred.reject(error);
        });

        function applyCorrResult(value) {
            var isNumeric = jQuery.isNumeric(value);
            var bg;

            var html = '<span class="textOverflow tooltipOverflow" ' +
                        'title="' + value +
                        '" data-toggle="tooltip" data-placement="top" ' +
                        'data-container="body">' +
                            (isNumeric ? value.toFixed(3) : value) +
                        '</span>';
            if (isNumeric) {
                value = parseFloat(value);
                if (value > 0) {
                    bg = "rgba(66, 158, 212," + value + ")";

                    $("#mainAgg2").find(".aggCol:not(.labels)").eq(col)
                    .find(".aggTableField:not(.colLabel)").eq(row).html(html)
                    .css("background-color", bg);
                } else {
                    bg = "rgba(200, 200, 200," + (-1 * value) + ")";

                    $("#mainAgg2").find(".aggCol:not(.labels)").eq(col)
                    .find(".aggTableField:not(.colLabel)").eq(row).html(html)
                    .css("background-color", bg);
                }
            } else {
                $("#mainAgg2").find(".aggCol:not(.labels)").eq(col)
                .find(".aggTableField:not(.colLabel)").eq(row).html(html);
            }

            var $container;
            colDups.forEach(function(colNum) {
                // beacause of checkDupcols(), colNum > col
                // and since col > row
                // so colNum > row
                $container = $("#mainAgg2").find(".aggCol:not(.labels)")
                                .eq(colNum)
                                .find(".aggTableField:not(.colLabel)")
                                .eq(row).html(html);

                if (isNumeric) {
                    $container.css("background-color", bg);
                }
            });

            var rowDups = checkDupCols(row);
            var newCol;
            var newRow;
            rowDups.forEach(function(rowNum) {
                newRow = col;
                newCol = rowNum;

                if (newCol > newRow) {
                    $container = $("#mainAgg2").find(".aggCol:not(.labels)")
                                .eq(newCol)
                                .find(".aggTableField:not(.colLabel)")
                                .eq(newRow).html(html);

                    if (isNumeric) {
                        $container.css("background-color", bg);
                    }
                }
            });
        }

        return (deferred.promise());
    }

    function resetAggTables() {
        $('#mainTable').off();
        $modalBackground.off("click", hideAggOpSelect);

        var fadeOutTime = gMinModeOn ? 0 : 300;

        $aggModal.hide();
        $modalBackground.fadeOut(fadeOutTime, function() {
            Tips.refresh();
        });
        $aggModal.width(920).height(670);
        modalHelper.clear();
    }

    return (AggModal);
}(jQuery, {}));
