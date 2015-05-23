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
        $modalBackground.fadeIn(300);
        centerPositionElement($aggModal)

        aggColumns(tableNum);
        aggVert(tableNum);
    }

    function hideAggOpSelect() {
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

        var aggrFunctions = ["Sum", "Average", "Min", "Max", "Count"];
        var $mainAgg      = $("#mainAgg");

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

        $mainAgg.find('.vertTabArea').html(tabHtml);
        $mainAgg.find('.quickAggArea').html(wholeTable);

        // First we need to determine if this is a dataset-table
        // or just a regular table
        xcFunction.checkSorted(tableNum)
        .then(function(tableName) {
            for (var j = 0; j < numColumns; j++) {
                var cols = table.tableCols[j];
                // XXX Skip DATA!
                if ((cols.type === "integer" || cols.type === "decimal")
                     && cols.name !== "DATA") {
                    var $colHeader = $("#xcTable" + tableNum + " .th.col" + 
                                        (j+1)  + " .header");
                    // XXX now agg on child of array is not supported
                    if (!$colHeader.hasClass("childOfArray")) {
                        for (var i = 0; i < 5; i++) {
                            runAggregate(tableName, cols.func.args[0], 
                                        aggrFunctions[i], i, j);
                        }
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
        $modalBackground.off("click", hideAggOpSelect);
        $aggModal.hide();
        $modalBackground.fadeOut(300);
        $aggModal.width(920).height(670);
    }

    return (AggModal);
}(jQuery, {}))
