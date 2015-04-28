function aggColumns(tableNum) {
    var numColumns = gTables[tableNum].tableCols.length;
    var tabHtml = "";
    var tbody;
    
    $columnArea = $('.quickAggArea');
    // XXX Skip DATA!
    for (var i = 0; i < numColumns; i++) {
        if (gTables[tableNum].tableCols[i].name != "DATA") {
            tabHtml += '<div class="tableLabel">' + 
                        gTables[tableNum].tableCols[i].name + 
                       '</div>';
        }
    }

    $("#mainAgg").find('.tableTabs').html(tabHtml);
}

function aggVert(tableNum) {
    var aggrFunctions = ["Sum", "Avg", "Min", "Max", "Count"];
    var tabHtml = "";
    var tbody;
    
    $columnArea = $('.quickAggArea');
    // Skip DATA!
    for (var i = 0; i < aggrFunctions.length; i++) {
        tabHtml += '<div class="tableLabel tableLabelVert">' + 
                        aggrFunctions[i] + 
                   '</div>';
    }
    var wholeTable = '<div class="aggTable">';
    for (var j = 0; j<gTables[tableNum].tableCols.length; j++) {
        if (gTables[tableNum].tableCols[j].name != "DATA") {
            wholeTable += '<div class="aggCol">';
            for (var i = 0; i<5; i++) {
                wholeTable += '<div class="aggTableField">';
                if (gTables[tableNum].tableCols[j].type == "number") {
                    wholeTable += '<div class="spinny"></div>';
                } else {
                    wholeTable += "N/A";
                }
                wholeTable += "</div>";
            }
            wholeTable += "</div>";
        }
    }
    wholeTable += "</div>";
    $("#mainAgg").find('.vertTabArea').html(tabHtml);
    $("#mainAgg").find('.quickAggArea').html(wholeTable);
    
    // First we need to determine if this is a dataset-table or just a
    // regular table

    checkSorted(tableNum)
    .then(function(tableName) { 
        for (var j = 0; j<gTables[tableNum].tableCols.length; j++) {
            if (gTables[tableNum].tableCols[j].name != "DATA") {
                for (var i = 0; i<5; i++) {
                    if (gTables[tableNum].tableCols[j].type == "number") {
                        runAggregate(tableName,
                                   gTables[tableNum].tableCols[j].func.args[0],
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
        var obj = jQuery.parseJSON(value);
        $(".aggTable .aggCol:eq("+col+") .aggTableField:eq("+row+")").html(
            obj["Value"]);
    });
}

function setupAggModalTables(tableNum) {
        $('#quickAggDialog').show();
        $('#modalBackground').fadeIn(300);
        $("#aggInputSection input")
            .val(gTables[tableNum].frontTableName);
        aggColumns(tableNum); 
        aggVert(tableNum);
}

function initializeAggModal() {
    $aggSelect = $('#aggOp');
    $aggDropdown = $('#aggOpSelect');

    $('#closeAgg').click(function() {
        resetAggTables();
    });

    $aggSelect.mousedown(function(event) {
        if ($(event.target).closest('#aggOpSelect').length != 0) {
            return;
        }
        if ($(this).hasClass('open')) {
            $aggDropdown.hide();
            $(this).removeClass('open');
        } else {
            $aggDropdown.show()
            $(this).addClass('open');
        }
    });

    $aggDropdown.find('li').click(function() {
        if ($(this).hasClass('inactive')) {
            return;
        }
        var aggOp = $(this).text();
        $aggSelect.find('.text').text(aggOp);
        $aggDropdown.hide();
        $aggSelect.removeClass('open');
    });

    $('#modalBackground').mousedown(hideAggOpSelect);
    $('#quickAggDialog').mousedown(hideAggOpSelect);
    $("#aggInputSection input").val("tempTableName");

}

function hideAggOpSelect(event) {
    if ($(event.target).closest('#aggOp').length == 0) {
        $('#aggOpSelect').hide();
    }
}

function resetAggTables() {
    $('#modalBackground').hide();
    $('#quickAggDialog').hide();
    $('#mainTable').off();
    $('#quickAggDialogDialog').width(920).height(620);
}
