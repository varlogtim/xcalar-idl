window.AggModal = (function($, AggModal) {
    var $modalBackground = $("#modalBackground");
    var $aggModal        = $("#quickAggDialog");

    var $aggSelect       = $("#aggOp");
    var $aggDropdown     = $("#aggOpSelect");

    var $aggTableName    = $("#aggRoundedInput");

    AggModal.setup = function () {
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
            handle: '.modalHeader',
            cursor: '-webkit-grabbing',
            containment: 'window'
        });
        $aggModal.resizable({
            handles: "e, w",
            minHeight: 300,
            minWidth: 580,
            containment: "document"
        });
    }

    AggModal.show = function (tableNum) {
        $modalBackground.on("click", hideAggOpSelect);
        $aggTableName.val(gTables[tableNum].frontTableName);

        $aggModal.show();
        $modalBackground.fadeIn(300, function() {
            Tips.refresh();
        });
        centerPositionElement($aggModal)

        aggColumns(tableNum, $("#mainAgg1"));
        aggColumns(tableNum, $("#mainAgg2"));
        
        xcFunction.checkSorted(tableNum)
        .then(function(tableName) {
            aggVert(tableNum, tableName);
            calcCorr(tableNum, tableName);
        });
    }

    function hideAggOpSelect() {
        $aggDropdown.hide();
        $aggSelect.removeClass('open');
    }

    function aggColumns(tableNum, target) {
        var table      = gTables[tableNum];
        var numColumns = table.tableCols.length;
        var tabHtml    = "";
        var tbody;

        for (var i = 0; i < numColumns; i++) {
            var colName = table.tableCols[i].name;
            // XXX Skip DATA!
            if (colName === "DATA") {
                continue;
            }

            tabHtml += '<div class="tableLabel">' + colName + '</div>';
        }

        target.find('.tableTabs').html(tabHtml);
    }

    function calcCorr(tableNum, tableName) {
        var table         = gTables[tableNum];
        var numColumns    = table.tableCols.length;
        var vertColumns   = [];
        var $mainAgg2     = $("#mainAgg2");
        var tabHtml       = "";
        var tbody;

        for (var i = 0; i < numColumns; i++) {
            var colName = table.tableCols[i].name;
            if (colName === "DATA") {
                continue;
            }
            vertColumns.push(table.tableCols[i]);
        }

        for (var i = 0; i < vertColumns.length; i++) {
            tabHtml += '<div class="tableLabel tableLabelVertSkinny">' + 
                            vertColumns[i].name + 
                       '</div>';
        }

        var wholeTable    = '<div class="aggTable">';

        for (var j = 0; j < numColumns; j++) {
            var cols = table.tableCols[j];
            // XXX Skip DATA!
            if (cols.name === "DATA") {
                continue;
            }

            wholeTable += '<div class="aggCol">';

            var isChildOfArray = $("#xcTable" + tableNum + " .th.col" + 
                                (j+1)  + " .header").hasClass("childOfArray");

            for (var i = 0; i < vertColumns.length; i++) {
                wholeTable += '<div class="aggTableField aggTableFlex" ';
                var backgroundOpacity =
                                    "style='background-color:rgba(66,158,212,";
                if (i == j) {
                    wholeTable += ">1";
                } else if (i > j) {
                    wholeTable += backgroundOpacity + "0)'";
                    wholeTable += ">See other";
                } else if ((cols.type === "integer" || cols.type === "decimal")
                           && (vertColumns[i].type === "integer" ||
                               vertColumns[i].type === "decimal")) {
                    // XXX now agg on child of array is not supported
                    if (isChildOfArray) {
                        wholeTable += backgroundOpacity + "0)'";
                        wholeTable += ">Not Supported"
                    } else {
                        wholeTable += backgroundOpacity + "0)'";
                        wholeTable += '><div class="spinny"></div>';
                    }
                } else {
                    wholeTable += backgroundOpacity + "0)'";
                    wholeTable += ">N/A";
                }

                wholeTable += "</div>";
            }

            wholeTable += "</div>";
        }

        wholeTable += "</div>";

        $mainAgg2.find('.vertTabArea').html(tabHtml);
        $mainAgg2.find('.quickAggArea').html(wholeTable);

        var dupCols = [];
        // First we need to determine if this is a dataset-table
        // or just a regular table

        var corrString = "div(sum(mult(sub($arg1, avg($arg1)), sub($arg2," +
                         "avg($arg2)))), sqrt(mult(sum(pow(sub($arg1, " +
                         "avg($arg1)), 2)), sum(pow(sub($arg2, avg($arg2)), "+
                         "2)))))";

        for (var j = 0; j < numColumns; j++) {
            var cols = table.tableCols[j];
            // XXX Skip DATA!
            if ((cols.type === "integer" || cols.type === "decimal")
                 && cols.name !== "DATA") {
                // for duplicated columns, no need to trigger thrift call
                if (dupCols[j]) {
                    console.log("Duplicated column", j);
                    continue;
                }

                var dups = checkDupCols(table.tableCols, j);
                dups.forEach(function(colNum) {
                    dupCols[colNum] = true;
                });

                var $colHeader = $("#xcTable" + tableNum + " .th.col" + 
                                    (j+1)  + " .header");
                // XXX now agg on child of array is not supported
                if (!$colHeader.hasClass("childOfArray")) {
                    for (var i = 0; i < j; i++) {
                        if (i == j) {
                            // Must be 1 so skip
                            continue;
                        }
                        if ((vertColumns[i]).type != "integer" &&
                            (vertColumns[i]).type != "decimal") {
                            continue;
                        }
                        var sub = corrString.replace(/[$]arg1/g, cols.name);
                        sub = sub.replace(/[$]arg2/g, vertColumns[i].name);
                        // Run correlation function
                        runCorr(tableName, sub, i, j, dups);
                    }
                }
            }
        }
    }

    function aggVert(tableNum, tableName) {
        var table         = gTables[tableNum];
        var numColumns    = table.tableCols.length;

        var aggrFunctions = ["Sum", "Avg", "Min", "Max", "Count"];
        var $mainAgg1      = $("#mainAgg1");

        var tabHtml       = "";
        var tbody;

        for (var i = 0; i < aggrFunctions.length; i++) {
            tabHtml += '<div class="tableLabel tableLabelVert">' + 
                            aggrFunctions[i] + 
                       '</div>';
        }

        var wholeTable    = '<div class="aggTable">';

        for (var j = 0; j < numColumns; j++) {
            var cols = table.tableCols[j];
            // XXX Skip DATA!
            if (cols.name === "DATA") {
                continue;
            }

            wholeTable += '<div class="aggCol">';

            var isChildOfArray = $("#xcTable" + tableNum + " .th.col" + 
                                (j+1)  + " .header").hasClass("childOfArray");

            for (var i = 0; i < 5; i++) {
                wholeTable += '<div class="aggTableField">';

                if (cols.type === "integer" || cols.type === "decimal") {
                    // XXX now agg on child of array is not supported
                    if (isChildOfArray) {
                        wholeTable += "Not Supported"
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

        wholeTable += "</div>";

        $mainAgg1.find('.vertTabArea').html(tabHtml);
        $mainAgg1.find('.quickAggArea').html(wholeTable);

        // First we need to determine if this is a dataset-table
        // or just a regular table
        var dupCols = [];

        for (var j = 0; j < numColumns; j++) {
            var cols = table.tableCols[j];
            // XXX Skip DATA!
            if ((cols.type === "integer" || cols.type === "decimal")
                 && cols.name !== "DATA") {
                // for duplicated columns, no need to trigger thrift call
                if (dupCols[j]) {
                    console.log("Duplicated column", j);
                    continue;
                }

                var dups = checkDupCols(table.tableCols, j);
                dups.forEach(function(colNum) {
                    dupCols[colNum] = true;
                });

                var $colHeader = $("#xcTable" + tableNum + " .th.col" + 
                                    (j+1)  + " .header");
                // XXX now agg on child of array is not supported
                if (!$colHeader.hasClass("childOfArray")) {
                    for (var i = 0; i < 5; i++) {
                        runAggregate(tableName, cols.func.args[0], 
                                    aggrFunctions[i], i, j, dups);
                    }
                }
            }
        }
    }

    function checkDupCols(tableCols, colNum) {
        if (!tableCols[colNum].func.args) {
            return ([]);
        }

        var args  = tableCols[colNum].func.args[0];
        var dups  = [];
        for (var i = colNum + 1; i < tableCols.length; i++) {
            if (tableCols[i].func.args && 
                (tableCols[i].func.args[0] === args) && 
                (tableCols[i].func.func !== "raw")) 
            {
                dups.push(i);
            }
        }
        return (dups);
    }

    function runAggregate(tableName, fieldName, opString, row, col, dups) {
        XcalarAggregate(fieldName, tableName, opString)
        .done(function(value) {
            var val;

            try {
                var obj = jQuery.parseJSON(value);

                val     = obj["Value"];
            } catch (error) {
                console.error(error, obj);
                val     = "";
            }

            $("#mainAgg1 .aggTable .aggCol:eq(" + col + ")" + 
              " .aggTableField:eq(" + row + ")").html(val);

            dups.forEach(function(colNum) {
                $("#mainAgg1 .aggTable .aggCol:eq(" + colNum + ")" + 
                  " .aggTableField:eq(" + row + ")").html(val);
            });
        });
    }

    function runCorr(tableName, evalStr, row, col, dups) {
        XcalarAggregateHelper(tableName, evalStr)
        .done(function(value) {
            var val;

            try {
                var obj = jQuery.parseJSON(value);
                val     = obj["Value"];
            } catch (error) {
                console.error(error, obj);
                val     = "";
            }

            if (jQuery.isNumeric(val)) {
                val = parseFloat(val);
                $("#mainAgg2 .aggTable .aggCol:eq(" + col + ")" + 
                  " .aggTableField:eq(" + row + ")").html(val);

                $("#mainAgg2 .aggTable .aggCol:eq(" + col + ")" + 
                  " .aggTableField:eq(" + row + ")").css("background-color",
                  "rgba(66, 158, 212,"+val+")");
            }
            dups.forEach(function(colNum) {
                $("#mainAgg2 .aggTable .aggCol:eq(" + colNum + ")" + 
                  " .aggTableField:eq(" + row + ")").html(val);
                if (jQuery.isNumeric(val)) {
                    $("#mainAgg2 .aggTable .aggCol:eq(" + col + ")" + 
                      " .aggTableField:eq(" + row + ")").css("background-color",
                      "rgba(66, 158, 212,"+val+")");
                }
            });
        });
    }

    function resetAggTables() {
        $('#mainTable').off();
        $modalBackground.off("click", hideAggOpSelect);
        $aggModal.hide();
        $modalBackground.fadeOut(300, function() {
            Tips.refresh();
        });
        $aggModal.width(920).height(670);
    }

    return (AggModal);
}(jQuery, {}))
