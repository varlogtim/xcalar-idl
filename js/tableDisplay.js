function fillPageWithBlankCol(tableNum) {
    var tableWidth = $("#autoGenTable"+tableNum).width();
    var screenWidth = window.screen.availWidth;
    var numColsToFill = Math.ceil((screenWidth - tableWidth)/gNewCellWidth);
    var startColId = $("#autoGenTable"+tableNum+" tr:first th").length;
    for (var i = 0; i<numColsToFill; i++) {
        addCol("col"+(startColId-1), "autoGenTable"+tableNum, "", 
            {'isDark': true});
    }
}

function generateBlankTable() {
    generateFirstScreen("", 1, 0);
    var screenWidth = window.screen.availWidth;
    var numColsToFill = Math.ceil(screenWidth/gNewCellWidth);
    var html = "";
    var table = $('#autoGenTable0');
    table.parent().addClass('blankTable');
    table.find('thead, tbody').empty();
    html += '<tr>';
    html += '<th style="width:'+(gRescol.cellMinWidth+10)+'px;"></th>';
    for (var i = 0; i < numColsToFill; i++) {
            html += '<th style="width:'+gNewCellWidth+'px;"></th>';
    }
    html += '</tr>';
    table.find('thead').append(html);
    html = "";
    for (var i = 0; i < gRescol.minNumRows;  i++) {
        html += '<tr>';
        html += '<td align="center" '+
                    'style="height:'+gRescol.minCellHeight+'px;">'+
                    '<div class="idWrap"><span class="idSpan">'+
                    (i+1)+'</span>'+
                    '<div class="rowGrab"></div>'+
                    '</div>'+
                '</td>';
        for (var j = 0; j<numColsToFill; j++) {
            html += '<td></td>';
        }
        html += '</tr>';
    }
    table.find('tbody').html(html);
    table.width(screenWidth);
    table.find('.rowGrab').mousedown(function(event) {
        resrowMouseDown($(this), event);
    });

    cloneTableHeader(0);
    table.parent().scroll(function() {
        var dynTableNum = parseInt($(this).attr("id")
                           .substring("autoGenTableWrap".length));
        var top = $(this).scrollTop();
        $('#theadWrap'+dynTableNum).css('top',top);
    });
    checkForScrollBar(0);
}

function generateRowWithCurrentTemplate(json, id, rowTemplate, direction, 
                                        tableNum) {
    var table = $("#autoGenTable"+tableNum);
    // Replace JSON
    var firstPart = rowTemplate.firstPart;
    var secondPart = rowTemplate.secondPart;
    var finalString = firstPart+json+secondPart;
    // Replace id
    firstIndex = finalString.indexOf('bookmark">')+('bookmark">').length;
    secondIndex = finalString.indexOf("<", firstIndex);
    firstPart = finalString.substring(0, firstIndex);
    secondPart = finalString.substring(secondIndex);
    finalString = "<tr class='row"+id+"'>"+firstPart +(id+1)+ secondPart+"</tr>";
    if (direction == 1) {
        var row = "tr:first-child";
    } else {
        var row = "tr:last-child";
    }

    if (table.find("tbody tr").length == 0) {
        table.find("tbody").append(finalString);
    } else { 
        if (direction == 1) {
            table.prepend(finalString);
        } else {
            table.append(finalString);
        }    
    }

    // check if this row is bookmarked
    if (gTables[tableNum].bookmarks.indexOf(id) > -1) {
        var td = table.find('.row'+id+ ' .col0');
        td.addClass('rowBookmarked');
        td.find('.idSpan').attr('title', 'bookmarked');
    }
    
    addRowListeners(id, tableNum);
}

function generateFirstScreen(value, idNo, tableNum, height) {
    if (height == undefined) {
        var cellHeight = gRescol.minCellHeight;
    } else {
        var cellHeight = height;
    }
    if ($('#autoGenTable'+tableNum).length != 1) {
        if (tableNum == 0) {
            $('#mainFrame').prepend('<div id="autoGenTableWrap'+tableNum+'"'+
                    ' class="autoGenTableWrap tableWrap"></div>');
        } else {
            $('#autoGenTableWrap'+(tableNum-1))
            .after('<div id="autoGenTableWrap'+tableNum+'"'+
                    ' class="autoGenTableWrap tableWrap"></div>');
        }

        var newTable = 
        '<table id="autoGenTable'+tableNum+'" class="autoGenTable dataTable">'+
          '<thead>'+
          '<tr>'+
            '<th style="width: 50px;" class="col0 table_title_bg">'+
              '<div class="header">'+
                '<span><input value="ROW" readonly="" tabindex="-1"></span>'+
              '</div>'+
            '</th>'+
            '<th class="col1 table_title_bg dataCol" style="width: 850px;">'+
              '<div class="header">'+
                '<div class="dropdownBox" style="opacity: 0;"></div>'+
                '<span><input value="DATA" '+
                'readonly="" tabindex="-1" class="dataCol" title="raw data">'+
                '</span>'+
                '<ul class="colMenu" style="display: none;">'+
                  '<li class="menuClickable">Add a column'+
                    '<ul class="subColMenu">'+
                      '<li class="addColumns addColLeft col1">On the left</li>'+
                      '<li class="addColumns addColRight col1">'+
                      'On the right</li>'+
                      '<div class="subColMenuArea"></div>'+
                    '</ul>'+
                    '<div class="rightArrow"></div>'+
                  '</li>'+
                  '<li id="duplicate3" class="duplicate col1">'+
                  'Duplicate column</li>'+
                  '<li class="sort col1">Sort</li>'+
                '</ul>'+
              '</div>'+
            '</th>'+
          '</tr>'+
          '</thead>'+
          '<tbody>'+
          '</tbody>'+
        '</table>';
        $('#autoGenTableWrap'+tableNum).append(newTable);
    }
    var table = $("#autoGenTable"+tableNum);
    table.append('<tr class="row'+idNo+'">'+
        '<td align="center" class="col0" style="height:'+cellHeight+'px;">'+
        '<div class="idWrap">'+
        '<span class="idSpan" title="double-click to bookmark">'+
        (idNo+1)+'</span><div class="rowGrab"></div></div></td>'+
        '<td class="jsonElement col1">'+
        '<div title="double-click to view" '+
        'class="elementTextWrap" style="max-height:'+
        (cellHeight-4)+'px;">'+
        '<div class="elementText">'+
        value+'</div>'+
        '</div>'+
        '</td>'+
        '</tr>');

    addRowListeners(idNo, tableNum);
}

function createRowTemplate(tableNum) {
    var startString = '<div class="elementText">';
    var endString="</div>";
    var originalString = $("#autoGenTable"+tableNum+" tbody tr:last").html() ||
                         gTempStyle;
    var index = originalString.indexOf(startString);
    var firstPart = originalString.substring(0, index+startString.length);
    var secondPart = originalString.substring(index+startString.length+1);
    var secondIndex = secondPart.indexOf(endString);
    secondPart = secondPart.substring(secondIndex);
    var parts = {};
    parts.firstPart = firstPart;
    parts.secondPart = secondPart;
    return (parts);
}

function resizeForMultipleTables(tableNum) {
    //XX This function is hacky, need to modifiy where it's called
    // and then how it's executed
    if ($('.autoGenTable').length == 1) {
        return;
    }
    if ($('.autoGenTable').length == 2) {
        var tableWidth = $('#autoGenTable0').width();
        $('#theadWrap0').width(tableWidth+10);
    }

    $('.autoGenTableWrap').width('auto').css('overflow-x', 'hidden');
    var tableWidth = $('#autoGenTable'+tableNum).width();
    $('#theadWrap'+tableNum).width(tableWidth+10);
}

// Adds a table to the display
// Shifts all the ids and everything
function addTable(tableName, tableNum) {
    for (var i = gTables.length-1; i>=tableNum; i--) {
        $("#autoGenTableWrap"+i).attr("id", "autoGenTableWrap"+(i+1));
        $("#autoGenTable"+i).attr("id", "autoGenTable"+(i+1));
        $("#theadWrap"+i).attr("id", "theadWrap"+(i+1));
        $("#theadWrap"+(i+1)).css("z-index", 10-(i+1));
        $("#delTable"+i).attr("id", "delTable"+(i+1));
        $("#rowScroller"+i).attr("id", "rowScroller"+(i+1));
        $("#rowMarker"+i).attr("id", "rowMarker"+(i+1));

        gTables[i+1] = gTables[i];
    }
    var firstTime;
    if ($('.blankTable').length == 1) {
        $('.blankTable').remove();
        firstTime = true;
    }
    tableStartupFunctions(tableName, tableNum);
    if (firstTime) {
        documentReadyAutoGenTableFunction(); 
    }
    // XXX: Think about gActiveTableNum
}

// Removes a table from the display
// Shifts all the ids
// Does not delete the table from backend!
function delTable(tableNum) {
    $("#autoGenTableWrap"+tableNum).remove();
    $("#rowScroller"+tableNum).remove();
    var tableName = gTables[tableNum].frontTableName;
    gTables.splice(tableNum, 1);
    delete gTableIndicesLookup[tableName];
    for (var i = tableNum+1; i<gTables.length; i++) {
        $("#autoGenTableWrap"+i).attr("id", "autoGenTableWrap"+(i-1));
        $("#autoGenTable"+i).attr("id", "autoGenTable"+(i-1));
        $("#theadWrap"+i).attr("id", "theadWrap"+(i-1));
        $("#theadWrap"+(i-1)).css("z-index", 10-(i-1));
        $("#delTable"+i).attr("id", "delTable"+(i-1));
        $("#rowScroller"+i).attr("id", "rowScroller"+(i-1));
        $("#rowMarker"+i).attr("id", "rowMarker"+(i-1));
    }
    
    // XXX: Think about gActiveTableNum
    console.log($('.autoGenTable').length , gActiveTableNum, tableNum)
    gActiveTableNum--;
    if ($('#autoGenTable'+gActiveTableNum).length == 0) {
       gActiveTableNum = 0; 
       $('#rowScroller0').show();
    } else {
        $('#rowScroller'+gActiveTableNum).show();
    }
    generateFirstLastVisibleRowNum();
    // $('.tableTitle input')
    //         .removeClass('tblTitleSelected');
    // $('#theadWrap'+gActiveTableNum+' .tableTitle input')
    //         .addClass('tblTitleSelected');
    
    if ($('.autoGenTable').length == 1) {
        $('.autoGenTableWrap').width('100%').css('overflow-x', 'auto');
    }
}
