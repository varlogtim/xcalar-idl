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
            colHtml +=  '<th class="col' + (j + 1) + '">' + 
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
    $('#closeJoin').click(function() {
        resetJoinTables();
    });

    $('#cancelJoin').click(function() {
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

    // Fill in a default join name
    var joinTableName = "tempJoinTable" +
                        Math.floor((Math.random() * 100000) + 1);
    $("#inputSection input").val(joinTableName);

    $('.joinTableArea').scroll(function(){
        $(this).scrollTop(0);
    });

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

            // add Cli
            var cliOptions = {};
            cliOptions.operation = 'join';
            cliOptions.leftTable = {};
            cliOptions.leftTable.name = gTables[leftTableNum].frontTableName;
            cliOptions.leftTable.colName = gTables[leftTableNum]
                                           .tableCols[leftColumnNum].name;
            cliOptions.leftTable.colIndex = leftColumnNum;
            cliOptions.rightTable = {};
            cliOptions.rightTable.name = gTables[rightTableNum].frontTableName;
            cliOptions.rightTable.colName = gTables[rightTableNum]
                                            .tableCols[rightColumnNum].name;
            cliOptions.rightTable.colIndex = rightColumnNum;
            cliOptions.joinType = joinType;
            cliOptions.newTableName = newTableName;
            
            joinTables(newTableName, joinType, leftTableNum, 
                       leftColumnNum, rightTableNum, rightColumnNum)
            .done(function() {
                resetJoinTables();
                addCli("Join Table", cliOptions);
            });
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
    $("body").off("keypress", joinTableKeyPress);
    $('#inputSection input').val("");
    // Fill in a default join name
    var joinTableName = "tempJoinTable" +
                        Math.floor((Math.random() * 100000) + 1);
    $("#inputSection input").val(joinTableName);
    $('#joinDialog').hide();
    $('#joinModal').hide();
    $('#joinDialog').find('.tableLabel').remove();
    $('#joinDialog').find('.joinTable').remove();
    $('#joinDialog').width(920).height(620);
}
