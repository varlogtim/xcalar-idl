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
    var screenWidth = window.screen.availWidth;
    var numColsToFill = Math.ceil(screenWidth/gNewCellWidth);
    var html = "";
    // XX may not need to empty if we just start out empty, but
    // we need to adjust the other functions that depend on the id and
    // data column
    $('#autoGenTable0 thead, #autoGenTable0 tbody').empty();
    html += '<tr>';
    html += '<th style="width:'+(gRescol.cellMinWidth+10)+'px;"></th>';
    for (var i = 0; i < numColsToFill; i++) {
            html += '<th style="width:'+gNewCellWidth+'px;"></th>';
    }
    html += '</tr>';
    $('#autoGenTable0 thead').append(html);
    html = "";
    for (var i = 0; i < 60;  i++) {
    // XXX make a variable for 60 || num rows
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
    $('#autoGenTable0 tbody').html(html);
    $('#autoGenTable0').width(screenWidth);
    $('#autoGenTable0 .rowGrab').mousedown(function(event) {
        resrowMouseDown($(this), event);
    });

    cloneTableHeader(0);
}

function generateRowWithCurrentTemplate(json, id, rowTemplate, direction, 
                                        tableNum) {
    // Replace JSON
    var firstPart = rowTemplate.firstPart;
    var secondPart = rowTemplate.secondPart;
    var finalString = firstPart+json+secondPart;
    // Replace id
    firstIndex = finalString.indexOf('idSpan">')+('idSpan">').length;
    secondIndex = finalString.indexOf("<", firstIndex);
    firstPart = finalString.substring(0, firstIndex);
    secondPart = finalString.substring(secondIndex);
    finalString = "<tr class='row"+id+"'>"+firstPart +(id+1)+ secondPart+"</tr>";

    if (direction == 1) {
        var row = "tr:first-child";
    } else {
        var row = "tr:last-child";
    }

    if ($("#autoGenTable"+tableNum+" tbody tr").length == 0) {
        $("#autoGenTable"+tableNum+" tbody").append(finalString);
    } else { 
        if (direction == 1) {
            $("#autoGenTable"+tableNum).prepend(finalString);
        } else {
            $("#autoGenTable"+tableNum).append(finalString);
        }    
    }

    // Replace element id

    $('#autoGenTable'+tableNum+' tbody '+row+' .jsonElement')
        .dblclick(function() {
            showJsonModal($(this));
    });

    $('#autoGenTable'+tableNum+' tbody '+row+' .rowGrab')
        .mousedown(function(event) {
            resrowMouseDown($(this), event);
    });
}

function generateFirstScreen(value, idNo, tableNum, height) {
    if (height == undefined) {
        var cellHeight = gRescol.minCellHeight;
    } else {
        var cellHeight = height;
    }
    if ($('#autoGenTable'+tableNum).length != 1) {
        $('#mainFrame').append('<div id="autoGenTableWrap'+tableNum+'"'+
                                        ' class="autoGenTableWrap tableWrap"></div>');
        var newTable = '<table id="autoGenTable'+tableNum+'" class="autoGenTable dataTable">'+
                          '<thead>'+
                          '<tr>'+
                            '<th style="width: 50px;" class="col0 table_title_bg">'+
                              '<div class="header">'+
                                '<span><input value="ROW" readonly="" tabindex="-1"></span>'+
                              '</div>'+
                            '</th>'+
                            '<th class="col1 table_title_bg" style="width: 850px;">'+
                              '<div class="header">'+
                                '<div class="dropdownBox" style="opacity: 0;"></div>'+
                                '<span><input value="DATA" '+
                                'readonly="" tabindex="-1" class="dataCol" title="raw data"></span>'+
                                '<ul class="colMenu" style="display: none;">'+
                                  '<li class="menuClickable">Add a column'+
                                    '<ul class="subColMenu">'+
                                      '<li class="addColumns addColLeft col1">On the left</li>'+
                                      '<li class="addColumns addColRight col1">On the right</li>'+
                                      '<div class="subColMenuArea"></div>'+
                                    '</ul>'+
                                    '<div class="rightArrow"></div>'+
                                  '</li>'+
                                  '<li id="duplicate3" class="duplicate col1">Duplicate column</li>'+
                                  '<li class="sort col1">Sort</li>'+
                                '</ul>'+
                              '</div>'+
                            '</th>'+
                          '</tr>'+
                          '</thead>'+
                          '<tbody>'+
                          '</tbody>'+
                        '</table>';
        $('.autoGenTableWrap:last').append(newTable);
    }
    $("#autoGenTable"+tableNum).append('<tr class="row'+idNo+'">'+
        '<td align="center" class="col0" style="height:'+cellHeight+'px;">'+
        '<div class="idWrap"><span class="idSpan">'+
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

    $('#autoGenTable'+tableNum+' .row'+idNo+' .jsonElement')
    .dblclick(function(){
            showJsonModal($(this));
        }
    );
    $('#autoGenTable'+tableNum+' .row'+idNo+' .rowGrab')
        .mousedown(function(event) {
            resrowMouseDown($(this), event);
    });
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
    if (tableNum == 0) {
        return;
    }
    if (tableNum == 1) {
        var tableWidth = $('#autoGenTable0').width();
        $('#theadWrap0').width(tableWidth+5);
        // $('#autoGenTableWrap0').css('overflow-x', 'hidden');
    }

    $('.trueTHead').css('left', 0);
    $('.autoGenTableWrap').width('auto').css('overflow-x', 'hidden');
    var tableWidth = $('#autoGenTable'+tableNum).width();
    var tableOffsetLeft = $('#autoGenTable'+tableNum).position().left;
    $('#theadWrap'+tableNum).width(tableWidth+5);
    $('#theadWrap'+tableNum).css('left', tableOffsetLeft);
}