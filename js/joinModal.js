function joinModalTabs(modal) {
    modal.find('.tableLabel').remove();
    modal.find('.joinTable').remove();
    var numTables = gTables.length;
    var tabHtml = "";
    var tbody;
    
    columnArea = modal.find('.joinTableArea');
    for (var i = 0; i < gTables.length; i++) {
        tabHtml += '<div class="tableLabel">'+
                    gTables[i].frontTableName+
                   '</div>';
        var colHtml = "";
        // colHtml = '<div class="columnsWrap">';
        colHtml = '<table class="dataTable joinTable">'+
                  '<thead>'+
                  '<tr>';


        for (var j = 0; j < gTables[i].tableCols.length; j++) {
            if (gTables[i].tableCols[j].name == "DATA") {
                continue;
            }
            colHtml += '<th class="col'+(j+1)+'"><div class="columnTab">'+
                gTables[i].tableCols[j].name;
            '</div></th>';
        }
        // colHtml += '</div>';
        colHtml += '</tr></thead>';
        tbody = $('#xcTable'+i).find('tbody').clone(true);
        tbody.find('tr:gt(14)').remove();
        tbody.find('.col0').remove();
        tbody.find('.jsonElement').remove();
        tbody.find('.indexedColumn').removeClass('indexedColumn');
        tbody = tbody.html();
        colHtml += tbody;
        colHtml +='</table>';
        columnArea.append(colHtml);
    }

    modal.find('.tableTabs').append(tabHtml);
    addModalTabListeners(modal);
    // modal.find('.joinTable:first').show();
    modal.find('.tableLabel:first').trigger('click');
}

function setupJoinModalTables() {
        $('#joinDialog').show();
        $('#joinModal').fadeIn(300);
        joinModalTabs($('#leftJoin'));
        joinModalTabs($('#rightJoin'));
}

function initializeJoinModal() {
    $('#closeJoin').click(function() {
        resetJoinTables();
    });

    $('#cancelJoin').click(function() {
        // $('#joinDialog').hide();
        // $('#joinModal').hide();
        // $('#joinDialog').find('.tableLabel').remove();
        // $('#joinDialog').find('.joinTable').remove();
        resetJoinTables();
    });

    $('#joinType').mousedown(function() {
        if ($(this).hasClass('open')) {
            $('#joinTypeSelect').hide();
            $(this).removeClass('open');
        } else {
            $('#joinTypeSelect').show()
            $(this).addClass('open');
        }
    });

    $('#joinType').find('li').mousedown(function() {
        if ($(this).hasClass('inactive')) {
            return;
        }
        var joinType = $(this).text();
        $('#joinType').find('.text').text(joinType);
        setTimeout(function() {
            $('#joinTypeSelect').hide()
        }, 100);
    });

    $('#joinModal').mousedown(hideJoinTypeSelect);
    $('#joinDialog').mousedown(hideJoinTypeSelect);

 // ==================
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
            
            joinTables(newTableName, joinType, leftTableNum, 
                       leftColumnNum, rightTableNum, rightColumnNum);
            resetJoinTables();
        }
    });

}

function addModalTabListeners(modal) {
    modal.find('.tableLabel').click(function() {
        modal.find('.tableLabel.active').removeClass('active');
        $(this).addClass('active');
        var index = $(this).index();
        modal.find('.joinTable').hide();
        modal.find('.joinTable').eq(index).show();
    });

    modal.find('th').click(function() {
        var colNum = parseColNum($(this));
        var table = $(this).closest('table');
        console.log(colNum)
        if ($(this).hasClass('colSelected')) {
            $(this).removeClass('colSelected');
            table.find('.col'+colNum).removeClass('colSelected');
        } else {
            modal.find('.colSelected').removeClass('colSelected');
            $(this).addClass('colSelected');
            table.find('.col'+colNum).addClass('colSelected');
        }
    });
}

function hideJoinTypeSelect(event) {
    if ($(event.target).closest('#joinType').length == 0) {
        $('#joinTypeSelect').hide();
    }
}

function resetJoinTables() {
    $('#inputSection input').val("");
    $('#joinType').find('.text').text("Select Join Type:");
    $('#joinDialog').hide();
    $('#joinModal').hide();
    $('#joinDialog').find('.tableLabel').remove();
    $('#joinDialog').find('.joinTable').remove();
    $('#joinDialog').width(920).height(620);
}
