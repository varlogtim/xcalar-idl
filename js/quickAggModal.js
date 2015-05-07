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

        $aggSelect.mousedown(function(event) {
            event.stopPropagation();

            if ($aggSelect.length == 0) {
                return;
            }

            $aggSelect.toggleClass("open");
            $aggDropdown.toggle();
        });

        $aggDropdown.on("click", ".list li", function(event) {
            var $li  = $(this);

            event.stopPropagation();

            if ($li.hasClass("inactive")) {
                return;
            }

            var aggOp = $li.text();

            $aggSelect.find(".text").text(aggOp);

            $aggDropdown.hide();
            $aggSelect.removeClass("open");
        });

        $modalBackground.mousedown(hideAggOpSelect);
        $aggModal.mousedown(hideAggOpSelect);
        $aggTableName.val("tempTableName");
    }

    AggModal.show = function (tableNum) {
        $aggTableName.val(gTables[tableNum].frontTableName);

        $aggModal.show();
        $modalBackground.fadeIn(200);

        aggColumns(tableNum);
        aggVert(tableNum);
    }

    function hideAggOpSelect(event) {
        $aggDropdown.hide();
        $aggSelect.removeClass('open');
    }

    function aggColumns(tableNum) {
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

        $("#mainAgg").find('.tableTabs').html(tabHtml);
    }

    function aggVert(tableNum) {
        var table         = gTables[tableNum];
        var numColumns    = table.tableCols.length;

        var aggrFunctions = ["Sum", "Avg", "Min", "Max", "Count"];
        var $mainAgg      = $("#mainAgg");

        var tabHtml       = "";
        var tbody;

        for (var i = 0; i < aggrFunctions.length; i++) {
            tabHtml += '<div class="tableLabel tableLabelVert">' + 
                            aggrFunctions[i] + 
                       '</div>';
        }

        var wholeTable    = '<div class="aggTable">';

        for (var j = 0; j< numColumns; j++) {
            var cols = table.tableCols[j];
            // XXX Skip DATA!
            if (cols.name === "DATA") {
                continue;
            }

            wholeTable += '<div class="aggCol">';

            for (var i = 0; i < 5; i++) {
                wholeTable += '<div class="aggTableField">';

                if (cols.type === "number") {
                    wholeTable += '<div class="spinny"></div>';
                } else {
                    wholeTable += "N/A";
                }

                wholeTable += "</div>";
            }

            wholeTable += "</div>";
        }

        wholeTable += "</div>";

        $mainAgg.find('.vertTabArea').html(tabHtml);
        $mainAgg.find('.quickAggArea').html(wholeTable);

        // First we need to determine if this is a dataset-table
        // or just a regular table
        checkSorted(tableNum)
        .then(function(tableName) {
            for (var j = 0; j < numColumns; j++) {
                var cols = table.tableCols[j];
                // XXX Skip DATA!
                if (cols.type === "number" && cols.name !== "DATA") {
                    for (var i = 0; i < 5; i++) {
                        runAggregate(tableName, cols.func.args[0], 
                                    aggrFunctions[i], i, j);
                    }
                }
            }
        });
    }

    function runAggregate(tableName, fieldName, opString, row, col) {
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

            $("#mainAgg .aggTable .aggCol:eq(" + col + ")" + 
              " .aggTableField:eq(" + row + ")").html(val);
        });
    }

    function resetAggTables() {
        $('#mainTable').off();
        $aggModal.hide();
        $modalBackground.fadeOut(200);
        $aggModal.width(920).height(670);
    }

    return (AggModal);
}(jQuery, {}))
