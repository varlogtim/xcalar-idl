function joinModalTabs($modal, tableNum, colId) {
    $modal.find('.tableLabel').remove();
    $modal.find('.joinTable').remove();
    var numTables = gTables.length;
    var tabHtml = "";
    var tbody;
    
    $columnArea = $modal.find('.joinTableArea');
    for (var i = 0; i < gTables.length; i++) {
        tabHtml += '<div class="tableLabel">' + 
                        gTables[i].frontTableName + 
                   '</div>';
        var colHtml;
        // colHtml = '<div class="columnsWrap">';
        colHtml = '<table class="dataTable joinTable">' + 
                    '<thead>' + 
                        '<tr>';


        for (var j = 0; j < gTables[i].tableCols.length; j++) {
            var colName = gTables[i].tableCols[j].name;
            if (colName == "DATA") {
                continue;
            }
            var thClass = "col" + (j + 1);
            var type = gTables[i].tableCols[j].type;
            thClass += " type-" + type;
            if (type === "object" || type === "undefined") {
                thClass += " unselectable";
            }
            colHtml +=  '<th class="' + thClass + '">' + 
                            '<div class="columnTab">' + 
                                colName + 
                            '</div>' + 
                        '</th>';
        }

        colHtml += '</tr></thead>';
        $tbody = $('#xcTable'+i).find('tbody').clone(true);
        $tbody.find('tr:gt(14)').remove();
        $tbody.find('.col0').remove();
        $tbody.find('.jsonElement').remove();
        $tbody.find('.indexedColumn').removeClass('indexedColumn');
        var tbodyHtml = $tbody.html();
        colHtml += tbodyHtml;
        colHtml +='</table>';
        $columnArea.append(colHtml);
    }

    $modal.find('.tableTabs').append(tabHtml);
    addModalTabListeners($modal);
    // modal.find('.joinTable:first').show();

    // trigger click of table and column
    if (tableNum > 0) {
         $modal.find('.tableLabel:nth-child(' + tableNum + ')')
               .trigger('click');
    } else {
         $modal.find('.tableLabel:first').trigger('click');
    }

    if (colId > 0) {
        $modal.find('table.joinTable:nth-of-type(' + tableNum
                    + ') th:nth-child(' + colId + ')').trigger('click');
    }
}

function setupJoinModalTables(tableNum, colId) {
        $("body").on("keypress", joinTableKeyPress);
        $('#joinDialog').show();
        $('#joinModal').fadeIn(300);
        joinModalTabs($('#leftJoin'), (tableNum + 1), colId); 
        // here tableNum start from 1;
        joinModalTabs($('#rightJoin'), -1, -1);
}

function initializeJoinModal() {
    $joinSelect = $('#joinType');
    $joinDropdown = $('#joinTypeSelect');

    $('#closeJoin').click(function() {
        resetJoinTables();
    });

    $('#cancelJoin').click(function() {
        resetJoinTables();
    });

    $joinSelect.mousedown(function(event) {
        if ($(event.target).closest('#joinTypeSelect').length != 0) {
            return;
        }
        if ($(this).hasClass('open')) {
            $joinDropdown.hide();
            $(this).removeClass('open');
        } else {
            $joinDropdown.show()
            $(this).addClass('open');
        }
    });

    $joinDropdown.find('li').click(function() {
        if ($(this).hasClass('inactive')) {
            return;
        }
        var joinType = $(this).text();
        $joinSelect.find('.text').text(joinType);
        $joinDropdown.hide();
        $joinSelect.removeClass('open');
    });

    $('#joinModal').mousedown(hideJoinTypeSelect);
    $('#joinDialog').mousedown(hideJoinTypeSelect);

    // Fill in a default join name
    var joinTableName = xcHelper.randName("tempJoinTable-");

    $("#inputSection input").val(joinTableName);

    $('.joinTableArea').scroll(function(){
        $(this).scrollTop(0);
    });

 // This submits the joined tables
    $('#joinTables').click(function() {
        if($('#inputSection input').val() == "") {
            alert ("Name your new table");
        } else if ($('#joinType').find('.text').text()
            == "Select Join Type:") {
            alert ("Select Join Type");
        } else if ($('th.colSelected').length != 2) {
            alert ("Select 2 columns to join by");
        } else {
            var newTableName = $.trim($('#inputSection input').val());
            var joinType = $('#joinType').find('.text').text();

            var leftTableNum = $('#leftJoin').find('.tableLabel.active')
                               .index();
            var leftColumnNum = parseColNum($('#leftJoin').
                                find('th.colSelected')) - 1;

            var rightTableNum = $('#rightJoin').find('.tableLabel.active')
                                .index();
            var rightColumnNum = parseColNum($('#rightJoin').
                                find('th.colSelected')) - 1;
    
            xcFunction.join(leftColumnNum, leftTableNum, rightColumnNum, 
                            rightTableNum, joinType, newTableName)
            .always(resetJoinTables);
        }
    });
}

function joinTableKeyPress(e) {
    switch (e.which) {
        case keyCode.Enter:
            $('#joinTables').trigger('click');
            break;
        default:
            break;
    }
}

function addModalTabListeners($modal) {
    $modal.on('click', '.tableLabel', function() {
        var $tableLabel = $(this);
        $modal.find('.tableLabel.active').removeClass('active');
        $tableLabel.addClass('active');
        var index = $tableLabel.index();
        $modal.find('.joinTable').hide();
        $modal.find('.joinTable').eq(index).show();
    });
    $modal.on('click', 'th', function() {
        var $th = $(this);
        if ($th.hasClass("unselectable")) {
            if ($th.hasClass('clicked')) {
                return;
            }
            $th.addClass("clicked");
            var $div = $th.find("div");
            $div.attr("data-toggle", "tooltip");
            $div.attr("data-placement", "bottom");
            $div.attr("data-original-title", "can't join this type");
            $div.mouseover();
            setTimeout(function(){
                $div.mouseout();
                $div.removeAttr("data-toggle");
                $div.removeAttr("data-placement");
                $div.removeAttr("data-original-title");
                // XXX the reason for this time out is it will created more
                // than one tooltip if you click on th too quick
                setTimeout(function() {
                    $th.removeClass("clicked");
                }, 100);
            }, 800);
            return;
        }
        var colNum = parseColNum($th);
        console.log(colNum);
        var $table = $th.closest('table');
        if ($th.hasClass('colSelected')) {
            $th.removeClass('colSelected');
            $table.find('.col' + colNum).removeClass('colSelected');
        } else {
            $modal.find('.colSelected').removeClass('colSelected');
            $table.find('.col' + colNum).addClass('colSelected');
        }
    });
}

function hideJoinTypeSelect(event) {
    if ($(event.target).closest('#joinType').length == 0) {
        $('#joinTypeSelect').hide();
    }
}

function resetJoinTables() {
    $("body").off("keypress", joinTableKeyPress);
    $('#inputSection input').val("");
    // Fill in a default join name
    var joinTableName = xcHelper.randName("tempJoinTable-");

    $("#inputSection input").val(joinTableName);
    $('#joinDialog').hide();
    $('#joinModal').hide();
    $('#leftJoin').off();
    $('#rightJoin').off();
    $('#joinDialog').find('.tableLabel').remove();
    $('#joinDialog').find('.joinTable').remove();
    $('#joinDialog').width(920).height(620);
}
