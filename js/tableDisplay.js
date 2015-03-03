// Adds a table to the display
// Shifts all the ids and everything
function addTable(tableName, tableNum, AfterStartup) {
    var deferred = jQuery.Deferred();

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

    tableStartupFunctions(tableName, tableNum)
    .done(function() {
        if ($('#mainFrame').hasClass('empty')) {
            $('#mainFrame').removeClass('empty');
            documentReadyxcTableFunction(); 
        }
        if (!getIndex(tableName)) {
            console.log("This table has never been stored before. " + 
                        "Storing it now");
            setIndex(tableName, gTables[tableNum].tableCols);
        }
        if (AfterStartup) {
            addMenuBarTables([gTables[tableNum]], IsActive.Active);
        }

        deferred.resolve();
    });

    return (deferred.promise());
}

// Removes a table from the display
// Shifts all the ids
// Does not delete the table from backend!
function archiveTable(tableNum, del) {
    $("#xcTableWrap"+tableNum).remove();
    $("#rowScroller"+tableNum).remove();
    var tableName = gTables[tableNum].frontTableName;
    var deletedTable = gTables.splice(tableNum, 1);
    if (!del) {
        gHiddenTables.push(deletedTable[0]);
        gTableIndicesLookup[tableName].active = false;
        gTableIndicesLookup[tableName].timeStamp = (new Date()).getTime();
        moveMenuBarTable(deletedTable[0]);
    } else {
        delete (gTableIndicesLookup[tableName]);
        var $li = $("#activeTablesList").find('.tableName').filter(
                    function() {
                        return ($(this).text() == tableName);
                    }).closest("li");
        var $timeLine = $li.parent().parent();
        $li.remove();
        if ($timeLine.find('.tableInfo').length == 0) {
            $timeLine.remove();
        }
    }
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

function deleteTable(tableNum, deleteArchived) {
    // Basically the same as archive table, but instead of moving to
    // gHiddenTables, we just delete it from gTablesIndicesLookup
    if (deleteArchived) {
        var backTableName = gHiddenTables[tableNum].backTableName;
        var frontTableName = gHiddenTables[tableNum].frontTableName;
        var resultSetId = gHiddenTables[tableNum].resultSetId;
        gHiddenTables.splice((tableNum), 1);
        delete (gTableIndicesLookup[frontTableName]);
    } else {
        var backTableName = gTables[tableNum].backTableName;
        var resultSetId = gTables[tableNum].resultSetId;
        archiveTable(tableNum, DeleteTable.Delete);
    }
    
    // Free the result set pointer that is still pointing to it
    XcalarSetFree(resultSetId);    
    // Trigger delete
    return XcalarDeleteTable(backTableName);
}

function buildInitialTable(index, tableNum, jsonData) {
    var table = gTables[tableNum];
    table.tableCols = index;
    var tableOfEntries = XcalarGetNextPage(gTables[tableNum].resultSetId,
                                           gNumEntriesPerPage);
    table.keyName = tableOfEntries.keysAttrHeader.name;
    
    var dataIndex = generateTableShell(table.tableCols, tableNum);
    var numRows = jsonData.length;
    var startIndex = 0;

    addRowScroller(tableNum);
    if (numRows == 0) {
        console.log('no rows found, ERROR???');
        $('#rowScroller'+tableNum).addClass('hidden');
        jsonData = [""];
    }

    pullRowsBulk(tableNum, jsonData, startIndex, dataIndex);
    addTableListeners(tableNum);
    var numCols = table.tableCols.length;
    var $table = $('#xcTable'+tableNum);
    for (var i = 1; i <= numCols; i++) {
        addColListeners(i, $table);
    }
    if (numRows == 0) {
        $table.find('.idSpan').text("");
    }
}

function pullRowsBulk(tableNum, jsonData, startIndex, dataIndex, direction) {
    // this function does some preparation for pullAllCols()
    var startIndex = startIndex || 0;
    var $table = $('#xcTable'+tableNum);

    // get the column number of the datacolumn
    if (dataIndex === null) {
        dataIndex = parseColNum($('#xcTable'+tableNum)
                    .find('tr:first .dataCol')) - 1;
    }
    var newCells = pullAllCols(startIndex, jsonData, dataIndex, tableNum, 
                    direction);
    addRowListeners(newCells);

    var idColWidth = getTextWidth($table.find('tr:last td:first'));
    var newWidth = Math.max(idColWidth, 22);
    var padding = 12;
    if ($table.find('.fauxTHead').length != 0) {
        padding += 5;
    }
    $table.find('th:first-child').width(newWidth+padding);
    var colNum = 0;
    matchHeaderSizes(colNum, $table);
}

function generateTableShell(columns, tableNum) {
    // creates a new table, completed thead, and empty tbody
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
        '<table id="xcTable'+tableNum+'" class="xcTable dataTable" '+
        'style="width:0px;">'+
          '<thead>'+
          '<tr>'+
            '<th style="width: 50px;" class="col0 table_title_bg">'+
              '<div class="header">'+
                '<input value="" readonly="" tabindex="-1">'+
              '</div>'+
            '</th>';
    var numCols = columns.length;
    // info we need:  progColstuff
    var dataIndex = null;
    for (var i = 0; i < numCols; i++) {
        var color = "";
        var indexedColumnClass = ""; 
        if (columns[i].name == gTables[tableNum].keyName) {
            indexedColumnClass = " indexedColumn";
        }
        if (columns[i].name == "DATA") {
            dataIndex = i;
            newTable +=
                '<th class="col'+(i+1)+' table_title_bg dataCol" '+
                'style="width:'+columns[i].width+'px;">'+
                  '<div class="header">'+
                    '<div class="dropdownBox"><div class="innerBox">'+
                    '</div></div>'+
                    '<input value="DATA" '+
                    'readonly="" tabindex="-1" class="dataCol col'+(i+1)+
                    ' data-toggle="tooltip" data-placement="bottom" '+
                    '" title="raw data">'+
                    '<ul class="colMenu" style="display: none;">'+
                      '<li class="menuClickable">Add a column'+
                        '<ul class="subColMenu">'+
                          '<li class="addColumns addColLeft col'+(i+1)+'">'+
                            'On the left</li>'+
                          '<li class="addColumns addColRight col'+(i+1)+'">'+
                          'On the right</li>'+
                          '<div class="subColMenuArea"></div>'+
                        '</ul>'+
                        '<div class="dropdownBox"></div>'+
                      '</li>'+
                      '<li id="duplicate'+(i+1)+
                      '" class="duplicate col'+(i+1)+'">'+
                      'Duplicate column</li>'+
                      '<li class="sort col'+(i+1)+'">Sort</li>'+
                      '<li class="hide col'+(i+1)+'">Hide column</li>'+
                      '<li class="unhide col'+(i+1)+'">Unhide column</li>'+
                    '</ul>'+
                  '</div>'+
                '</th>';
        } else {
            newTable += generateColumnHeadHTML(indexedColumnClass, color,
                       (i+1), columns[i].name, columns[i].width);
        }  
    }

    newTable += '</tr></thead><tbody></tbody></table>';
    $('#xcTbodyWrap'+tableNum).append(newTable);
    return (dataIndex);
}
