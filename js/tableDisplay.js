// Adds a table to the display
// Shifts all the ids and everything
function addTable(tableName, tableNum, AfterStartup, tableNumsToRemove) {
    var deferred = jQuery.Deferred();
    reorderTables(tableNum);
    tableStartupFunctions(tableName, tableNum, tableNumsToRemove)
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
        if ($('.xcTable').length == 1) {
            focusTable(tableNum);
        }
        deferred.resolve();
    })
    .fail(function(error) {
        console.log("Add Table Fails!");
        deferred.reject(error);
    });

    return (deferred.promise());
}

// Removes a table from the display
// Shifts all the ids
// Does not delete the table from backend!
function archiveTable(tableNum, del, delayTableRemoval) {
    if (delayTableRemoval) {
        // if we're delaying the deletion of this table, we need to remove
        // these element's IDs so they don't interfere with other elements
        // as non-deleted tables' IDs get reordered
        $("#xcTableWrap"+tableNum).attr('id', 'tablesToRemove'+tableNum);
        $("#xcTableWrap"+tableNum).attr("id", "");
        $("#xcTheadWrap"+tableNum).attr("id", "");
        $("#xcTbodyWrap"+tableNum).attr("id", "");
        $("#xcTable"+tableNum).attr("id", "");
        $("#tableMenu"+tableNum).attr("id", "");
        $("#rowScroller"+tableNum).attr("id", "rowScrollerToRemove"+tableNum);
        $("#rowMarker"+tableNum).attr("id", "");
        $("#colMenu"+tableNum).attr("id", "");
    } else {
        $("#xcTableWrap"+tableNum).remove();
        $("#rowScroller"+tableNum).remove();
    }
    
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
        $("#colMenu"+i).attr("id", "colMenu"+(i-1));
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
    if (!delayTableRemoval) {
        focusTable(gActiveTableNum);
    }
    $('.dagWrap').find('.tableName')
        .filter(function() {
            return $(this).text() == tableName;
        })
        .closest('.dagWrap').remove();
}

function deleteTable(tableNum, deleteArchived) {
    var deferred = jQuery.Deferred();
    var table = deleteArchived ? gHiddenTables[tableNum] : gTables[tableNum];
    var backTableName = table.backTableName;
    var frontTableName = table.frontTableName;
    var resultSetId = table.resultSetId;
    
    // Free the result set pointer that is still pointing to it
    XcalarSetFree(resultSetId)
    .then(function() {
        return (XcalarDeleteTable(backTableName));
    })
    .done(function() {
        // XXX if we'd like to hide the cannot delete bug, copy it to 
        // the fail function

        // Basically the same as archive table, but instead of moving to
        // gHiddenTables, we just delete it from gTablesIndicesLookup
        if (deleteArchived) {
            gHiddenTables.splice((tableNum), 1);
            delete (gTableIndicesLookup[frontTableName]);
        } else {
            archiveTable(tableNum, DeleteTable.Delete);
        }
        deferred.resolve();
    })
    .fail(function(error){
        var options = {};
        options.title = 'DELETE TABLE FAILS!';
        options.msg = error;
        options.isAlert = true;
        Alert.show(options);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function buildInitialTable(index, tableNum, jsonData, keyName) {
    var table = gTables[tableNum];
    table.tableCols = index;
    table.keyName = keyName;
    var dataIndex = generateTableShell(table.tableCols, tableNum);
    var numRows = jsonData.length;
    var startIndex = 0;
    var $table = $('#xcTable'+tableNum);
    addRowScroller(tableNum);

    if (numRows == 0) {
        console.log('no rows found, ERROR???');
        $('#rowScroller'+tableNum).addClass('hidden');
        jsonData = [""];
    }

    pullRowsBulk(tableNum, jsonData, startIndex, dataIndex);
    addTableListeners(tableNum);
    createTableHeader(tableNum);
    generateColDropDown(tableNum);
    addColListeners($table, tableNum);

    if (numRows == 0) {
        $table.find('.idSpan').text("");
    }
}

function pullRowsBulk(tableNum, jsonData, startIndex, dataIndex, direction) {
    // this function does some preparation for pullAllCols()
    var startIndex = startIndex || 0;
    var $table = $('#xcTable'+tableNum);

    // get the column number of the datacolumn
    if (dataIndex == null) {
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
            '<th style="width: 50px;" class="col0 th">'+
              '<div class="header">'+
                '<input value="" readonly="" tabindex="-1">'+
              '</div>'+
            '</th>';
    var numCols = columns.length;
    var dataIndex = null;
    var table = gTables[tableNum];
    for (var i = 0; i < numCols; i++) {
        var color = "";
        var columnClass = ""; 
        if (columns[i].name == table.keyName) {
            columnClass = " indexedColumn";
        } else if (columns[i].name == "" || columns[i].func.func == "") {
            columnClass = " newColumn";
        }
        if (columns[i].name == "DATA") {
            dataIndex = i;
            var newColid = i + 1;
            newTable +=
                '<th class="col' + newColid + ' th dataCol" ' +
                    'style="width:' + columns[i].width + 'px;">' +
                    '<div class="header type-data">' +
                        '<div class="colGrab"></div>'+
                        '<div class="flexContainer flexRow">' + 
                        '<div class="flexWrap flex-left"></div>' + 
                        '<div class="flexWrap flex-mid">' + 
                            '<input value="DATA" readonly="" tabindex="-1"' + 
                                ' class="dataCol col' + newColid + 
                                ' data-toggle="tooltip" data-placement="bottom" ' +
                                '" title="raw data">' +
                        '</div>'+
                        '<div class="flexWrap flex-right">' + 
                            '<div class="dropdownBox">' + 
                                '<div class="innerBox"></div>' + 
                            '</div>' + 
                        '</div>' + 
                    '</div>' + 
                '</th>';
        } else {
            var name = "";
            if (columns[i].name == "") {
                name = columns[i].userStr;
            } else {
                name = columns[i].name
            }
            newTable += generateColumnHeadHTML(columnClass, color,
                       (i+1), name, columns[i].width);
        }  
    }

    newTable += '</tr></thead><tbody></tbody></table>';
    $('#xcTbodyWrap'+tableNum).append(newTable);
    return (dataIndex);
}

function reorderTables(tableNum) {
    for (var i = gTables.length-1; i>=tableNum; i--) {
        $("#xcTableWrap"+i).attr("id", "xcTableWrap"+(i+1));
        $("#xcTheadWrap"+i).attr("id", "xcTheadWrap"+(i+1));
        $("#xcTbodyWrap"+i).attr("id", "xcTbodyWrap"+(i+1));
        $("#xcTable"+i).attr("id", "xcTable"+(i+1));
        $("#tableMenu"+i).attr("id", "tableMenu"+(i+1));
        $("#rowScroller"+i).attr("id", "rowScroller"+(i+1));
        $("#rowMarker"+i).attr("id", "rowMarker"+(i+1));
        $("#colMenu"+i).attr("id", "colMenu"+(i+1));
        gTables[i+1] = gTables[i];
    }
}
