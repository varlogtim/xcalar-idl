function generateRowWithCurrentTemplate(json, id, rowTemplate, direction, 
                                        tableNum) {
    var table = $("#xcTable"+tableNum);
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
    if ($('#xcTable'+tableNum).length != 1) {
        if (tableNum == 0) {
            $('#mainFrame').prepend('<div id="xcTableWrap'+tableNum+'"'+
                    ' class="xcTableWrap tableWrap">'+
                    '<div id="xcTbodyWrap'+tableNum+'" class="xcTbodyWrap">'+
                    '</div></div>');
        } else {
            $('#xcTableWrap'+(tableNum-1))
            .after('<div id="xcTableWrap'+tableNum+'"'+
                    ' class="xcTableWrap tableWrap">'+
                    '<div id="xcTbodyWrap'+tableNum+'" class="xcTbodyWrap">'+
                    '</div></div>');
        }

        var newTable = 
        '<table id="xcTable'+tableNum+'" class="xcTable dataTable">'+
          '<thead>'+
          '<tr>'+
            '<th style="width: 50px;" class="col0 table_title_bg">'+
              '<div class="header">'+
                '<input value="" readonly="" tabindex="-1">'+
              '</div>'+
            '</th>'+
            '<th class="col1 table_title_bg dataCol" style="width: 500px;">'+
              '<div class="header">'+
                '<div class="dropdownBox"></div>'+
                '<input value="DATA" '+
                'readonly="" tabindex="-1" class="dataCol col1" title="raw data">'+
                '<ul class="colMenu" style="display: none;">'+
                  '<li class="menuClickable">Add a column'+
                    '<ul class="subColMenu">'+
                      '<li class="addColumns addColLeft col1">On the left</li>'+
                      '<li class="addColumns addColRight col1">'+
                      'On the right</li>'+
                      '<div class="subColMenuArea"></div>'+
                    '</ul>'+
                    '<div class="dropdownBox"></div>'+
                  '</li>'+
                  '<li id="duplicate3" class="duplicate col1">'+
                  'Duplicate column</li>'+
                  '<li class="sort col1">Sort</li>'+
                  '<li class="hide col1">Hide column</li>'+
                  '<li class="unhide col1">Unhide column</li>'+
                '</ul>'+
              '</div>'+
            '</th>'+
          '</tr>'+
          '</thead>'+
          '<tbody>'+
          '</tbody>'+
        '</table>';
        $('#xcTbodyWrap'+tableNum).append(newTable);
    }
    var table = $("#xcTable"+tableNum);
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
    var originalString = $("#xcTable"+tableNum+" tbody tr:last").html() ||
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

// Adds a table to the display
// Shifts all the ids and everything
function addTable(tableName, tableNum, AfterStartup) {
    for (var i = gTables.length-1; i>=tableNum; i--) {
        $("#xcTableWrap"+i).attr("id", "xcTableWrap"+(i+1));
        $("#xcTheadWrap"+i).attr("id", "xcTheadWrap"+(i+1));
        $("#xcTbodyWrap"+i).attr("id", "xcTbodyWrap"+(i+1));
        $("#xcTable"+i).attr("id", "xcTable"+(i+1));
        $("#tableMenu"+i).attr("id", "tableMenu"+(i+1));
        $("#rowScroller"+i).attr("id", "rowScroller"+(i+1));
        $("#rowMarker"+i).attr("id", "rowMarker"+(i+1));
        gTables[i+1] = gTables[i];
    }

    tableStartupFunctions(tableName, tableNum);

    if ($('#mainFrame').hasClass('empty')) {
        $('#mainFrame').removeClass('empty');
        documentReadyxcTableFunction(); 
    }
    if (!getIndex(tableName)) {
        console.log("This table has never been stored before. Storing it now");
        setIndex(tableName, gTables[tableNum].tableCols);
    }
    if (AfterStartup) {
        addMenuBarTables([gTables[tableNum]], IsActive.Active);
    }
    // focusTable(tableNum);
}

// Removes a table from the display
// Shifts all the ids
// Does not delete the table from backend!
function archiveTable(tableNum) {
    $("#xcTableWrap"+tableNum).remove();
    $("#rowScroller"+tableNum).remove();
    var tableName = gTables[tableNum].frontTableName;
    var deletedTable = gTables.splice(tableNum, 1);
    gHiddenTables.push(deletedTable[0]);
    gTableIndicesLookup[tableName].active = false;
    removeMenuBarTable(deletedTable[0]);
    // delete gTableIndicesLookup[tableName];
    for (var i = tableNum+1; i<=gTables.length; i++) {
        $("#xcTableWrap"+i).attr("id", "xcTableWrap"+(i-1));
        $("#xcTheadWrap"+i).attr("id", "xcTheadWrap"+(i-1));
        $("#xcTbodyWrap"+i).attr("id", "xcTbodyWrap"+(i-1));
        $("#xcTable"+i).attr("id", "xcTable"+(i-1));
        $("#tableMenu"+i).attr("id", "tableMenu"+(i-1));
        $("#rowScroller"+i).attr("id", "rowScroller"+(i-1));
        $("#rowMarker"+i).attr("id", "rowMarker"+(i-1));
    }
    
    // XXX: Think about gActiveTableNum
    gActiveTableNum--;
    if ($('#xcTable'+gActiveTableNum).length == 0) {
       gActiveTableNum = 0; 
       $('#rowScroller0').show();
    } else {
        $('#rowScroller'+gActiveTableNum).show();
    }
    generateFirstLastVisibleRowNum();
    focusTable(gActiveTableNum);
}
