window.AggModal = (function($, AggModal) {
    var $modalBackground = $("#modalBackground");
    var $aggModal        = $("#quickAggDialog");

    var $aggSelect    = $("#aggOp");
    var $aggDropdown  = $("#aggOpSelect");
    var $aggTableName = $("#aggRoundedInput");

    var aggrFunctions = ["Sum", "Avg", "Min", "Max", "Count"];
    var aggCols = [];

    AggModal.setup = function() {
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
            minHeight  : 300,
            minWidth   : 580,
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
    };

    AggModal.show = function(tableId, type) {
        var deferred = jQuery.Deferred();

        $modalBackground.on("click", hideAggOpSelect);

        var table     = xcHelper.getTableFromId(tableId);
        var tableName = table.tableName;
        var $table    = xcHelper.getElementByTableId(tableId, "xcTable");

        $aggTableName.val(tableName);
        centerPositionElement($aggModal);

        if (gMinModeOn) {
            $modalBackground.show();
            $aggModal.show();
            Tips.refresh();
        } else {
            $modalBackground.fadeIn(300, function() {
                $aggModal.fadeIn(180);
                Tips.refresh();
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

        var def1 = calcAgg($table, tableName);
        var def2 = calcCorr($table, tableName);

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

                if (cols.type === "integer" || cols.type === "decimal") {
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
                } else if ((cols.type === "integer" || cols.type === "decimal")
                           && (vertCols.type === "integer" ||
                               vertCols.type === "decimal"))
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


    function calcCorr($table, tableName) {
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

            if (cols.type === "integer" || cols.type === "decimal") {
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
                            vertCols.type !== "decimal")
                        {
                            continue;
                        }
                        var sub = corrString.replace(/[$]arg1/g,
                                                     cols.func.args[0]);
                        sub = sub.replace(/[$]arg2/g, vertCols.func.args[0]);
                        // Run correlation function
                        var promise = runCorr(tableName, sub, i, j, dups);
                        promises.push(promise);
                    }
                }
            }
        }

        return (xcHelper.when.apply(window, promises));
    }

    function calcAgg($table, tableName) {
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
            if (cols.type === "integer" || cols.type === "decimal") {
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
                        var promise = runAggregate(tableName, cols.func.args[0],
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

    function runAggregate(tableName, fieldName, opString, row, col, dups) {
        var deferred   = jQuery.Deferred();
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

            applyAggResult(val);
            deferred.resolve();
        })
        .fail(function(error) {
            applyAggResult("--");
            deferred.reject(error);
        });

        function applyAggResult(value) {
            $("#mainAgg1").find(".aggCol:not(.labels)").eq(col)
                .find(".aggTableField:not(.colLabel)").eq(row).html(value);

            dups.forEach(function(colNum) {
                $("#mainAgg1").find(".aggCol:not(.labels)").eq(colNum)
                    .find(".aggTableField:not(.colLabel)").eq(row).html(value);
            });
        }

        return (deferred.promise());
    }

    function runCorr(tableName, evalStr, row, col, dups) {
        var deferred   = jQuery.Deferred();
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

            applyCorrResult(val);
            deferred.resolve();
        })
        .fail(function(error) {
            applyCorrResult("--");
            deferred.reject(error);
        });

        function applyCorrResult(value) {
            if (jQuery.isNumeric(value)) {
                value = parseFloat(value);
                if (value > 0) {
                    $("#mainAgg2").find(".aggCol:not(.labels)").eq(col)
                    .find(".aggTableField:not(.colLabel)").eq(row).html(value)
                    .css("background-color", "rgba(66, 158, 212," + value + ")");
                } else {
                    $("#mainAgg2").find(".aggCol:not(.labels)").eq(col)
                    .find(".aggTableField:not(.colLabel)").eq(row).html(value)
                    .css("background-color", "rgba(200, 200, 200," + (-1 * value)
                     + ")");
                }
            } else {
                $("#mainAgg2").find(".aggCol:not(.labels)").eq(col)
                .find(".aggTableField:not(.colLabel)").eq(row).html(value);
            }

            dups.forEach(function(colNum) {
                var $container =
                    $("#mainAgg2").find(".aggCol.labels").eq(colNum)
                        .find(".aggTableField:not(.colLabel)").eq(row);

                $container.html(value);

                if (jQuery.isNumeric(value)) {
                    if (value > 0) {
                        $container.css("background-color",
                                        "rgba(66, 158, 212," + value + ")");
                    } else {
                        $container.css("background-color",
                                        "rgba(66, 158, 212," + (-1 * value) + ")");
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
    }

    return (AggModal);
}(jQuery, {}));
