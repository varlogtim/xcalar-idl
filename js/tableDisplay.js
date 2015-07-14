function refreshTable(newTableName, oldTableName,
                      keepOriginal, additionalTableName, focusWorkspace) {
    var deferred = jQuery.Deferred();

    
    if (focusWorkspace) {
        if (!$('#workspaceTab').hasClass('active')) {
            $("#workspaceTab").trigger('click');
            if ($('#dagPanel').hasClass('full') &&
                !$('#dagPanel').hasClass('hidden')) {
                $('#compSwitch').trigger('click');
                $('#mainFrame').removeClass('midway');
            }
        }
        $("#workspaceTab").trigger('click');
    }

    if (keepOriginal === KeepOriginalTables.Keep) {
        // append newly created table to the back
       
        addTable(newTableName, oldTableName, AfterStartup.After)
        .then(function() {
            if (focusWorkspace) {
                var newTableNum = xcHelper.getTableIndexFromName(newTableName);
                focusTable(newTableNum);
                var leftPos = $('#xcTableWrap' + newTableNum).position().left +
                                $('#mainFrame').scrollLeft();
                $('#mainFrame').animate({scrollLeft: leftPos})
                               .promise()
                               .then(function() {
                                    focusTable(newTableNum);
                                });
            }
            
            deferred.resolve();
        })
        .fail(function(error) {
            console.log("refreshTable fails!");
            deferred.reject(error);
        });
    } else {
        // default
        var targetTable = oldTableName;
        var tablesToRemove    = [];
        var delayTableRemoval = true;

        if (additionalTableName) {
            var firstTableNum = xcHelper.getTableIndexFromName(oldTableName);
            var secondTableNum =
                            xcHelper.getTableIndexFromName(additionalTableName);
            var tableToRemove;
            if (firstTableNum > secondTableNum) {
                targetTable = additionalTableName;
                tableToRemove = oldTableName;
            } else {
                targetTable = oldTableName;
                tableToRemove = additionalTableName;
            }

            tablesToRemove.push(tableToRemove);

            if (targetTable !== tableToRemove) {
                // excludes self join
                tablesToRemove.push(targetTable);
            }
        } else {
            tablesToRemove.push(oldTableName);
        }

        addTable(newTableName, targetTable, AfterStartup.After, tablesToRemove)
        .then(function() {
            if ($('.tblTitleSelected').length === 0) {
                var newTableNum = xcHelper.getTableIndexFromName(newTableName);
                focusTable(newTableNum);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            console.log("refreshTable fails!");
            deferred.reject(error);
        });
    }
    return (deferred.promise());
}

// Adds a table to the display
// Shifts all the ids and everything
function addTable(tableName, location, AfterStartup, tablesToRemove) {
    var deferred = jQuery.Deferred();
    var wsIndex  = WSManager.addTable(tableName);
    var tableNum;
    var tableNumsToRemove = [];

    setTableMeta(tableName)
    .then(function(newTableMeta) {

        if (location == null) {
            tableNum = gTables.length;
        } else {
            tableNum = xcHelper.getTableIndexFromName(location);
        }

        if (tablesToRemove) {
            var delayTableRemoval = true;
            for (var i = 0; i < tablesToRemove.length; i++) {
                var tableNumber =
                            xcHelper.getTableIndexFromName(tablesToRemove[i]);
                tableNumsToRemove.push(tableNumber);
                archiveTable(tableNumber, DeleteTable.Keep, delayTableRemoval);
            }
        }
        reorderTables(tableNum);

        gTables[tableNum] = newTableMeta;
        return (parallelConstruct(tableNum));
    })
    .then(function() {
        deferred.resolve();
    })
    .fail(function(error) {
        WSManager.removeTable(tableName);
        console.error("Add Table Fails!", error);
        deferred.reject(error);
    });

    return (deferred.promise());

    function parallelConstruct(tableNum) {
        var deferred  = jQuery.Deferred();
        var deferred1 = startBuildTable(tableNum, tableNumsToRemove);
        var deferred2 = Dag.construct(gTables[tableNum].tableName, tableNum);

        jQuery.when(deferred1, deferred2)
        .then(function() {
            tableNum = xcHelper.getTableIndexFromName(tableName);
            $("#xcTableWrap" + tableNum).addClass("worksheet-" + wsIndex);
            $("#dagWrap" + tableNum).addClass("worksheet-" + wsIndex);

            if (gTables[tableNum].resultSetCount !== 0) {
                infScrolling(tableNum);
            }

            resizeRowInput();

            if ($('#mainFrame').hasClass('empty')) {
                // first time to create table
                $('#mainFrame').removeClass('empty');
                documentReadyxcTableFunction();
            }
            if (AfterStartup) {
                RightSideBar.addTables([gTables[tableNum]], IsActive.Active);
            }
            if ($('.xcTable').length === 1) {
                focusTable(tableNum);
            }

            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }
}

// Removes a table from the display
// Shifts all the ids
// Does not delete the table from backend!
function archiveTable(tableNum, del, delayTableRemoval) {
    if (delayTableRemoval) {
        // if we're delaying the deletion of this table, we need to remove
        // these element's IDs so they don't interfere with other elements
        // as non-deleted tables' IDs get reordered
        $("#xcTableWrap" + tableNum).attr('id', 'tablesToRemove' + tableNum);
        $("#xcTableWrap" + tableNum).attr("id", "");
        $("#xcTheadWrap" + tableNum).attr("id", "");
        $("#xcTbodyWrap" + tableNum).attr("id", "");
        $("#xcTable" + tableNum).attr("id", "");
        $("#tableMenu" + tableNum).attr("id", "");
        $("#rowScroller" + tableNum).attr("id", "rowScrollerToRemove" + tableNum);
        $("#rowMarker" + tableNum).attr("id", "");
        $("#colMenu" + tableNum).attr("id", "");
        $("#dagWrap" + tableNum).attr("id", "dagWrapToRemove" + tableNum);
    } else {
        $("#xcTableWrap" + tableNum).remove();
        $("#rowScroller" + tableNum).remove();
        $('#dagWrap' + tableNum).remove();
    }
    
    var tableName = gTables[tableNum].tableName;
    var deletedTable = gTables.splice(tableNum, 1);
    if (!del) {
        gHiddenTables.push(deletedTable[0]);
        gTableIndicesLookup[tableName].active = false;
        gTableIndicesLookup[tableName].timeStamp = xcHelper.getTimeInMS();
        RightSideBar.moveTable(deletedTable[0]);
    } else {
        delete (gTableIndicesLookup[tableName]);
        var $li = $("#activeTablesList").find('.tableName').filter(
                    function() {
                        return ($(this).text() === tableName);
                    }).closest("li");
        var $timeLine = $li.parent().parent();
        $li.remove();
        if ($timeLine.find('.tableInfo').length === 0) {
            $timeLine.remove();
        }
    }
    for (var i = tableNum + 1; i <= gTables.length; i++) {
        $("#xcTableWrap" + i).attr("id", "xcTableWrap" + (i - 1));
        $("#xcTheadWrap" + i).attr("id", "xcTheadWrap" + (i - 1));
        $("#xcTbodyWrap" + i).attr("id", "xcTbodyWrap" + (i - 1));
        $("#xcTable" + i).attr("id", "xcTable" + (i - 1));
        $("#tableMenu" + i).attr("id", "tableMenu" + (i - 1));
        $("#rowScroller" + i).attr("id", "rowScroller" + (i - 1));
        $("#rowMarker" + i).attr("id", "rowMarker" + (i - 1));
        $("#colMenu" + i).attr("id", "colMenu" + (i - 1));
        $("#dagWrap" + i).attr("id", "dagWrap" + (i - 1));
    }
    // $('#rowInput').val("").data('val',"");
    // XXX: Think about gActiveTableNum
    gActiveTableNum--;
    if ($('#xcTable' + gActiveTableNum).length === 0) {
        gActiveTableNum = 0;
        $('#rowScroller0').show();
    } else {
        $('#rowScroller' + gActiveTableNum).show();
    }
    if (!delayTableRemoval && $('.xcTableWrap.active').length !== 0) {
        focusTable(gActiveTableNum);
    }
    if ($('.xcTableWrap.active').length === 0) {
        emptyScroller();
    }
    moveTableDropdownBoxes();
}

function deleteActiveTable(tableNum) {
    var tableName = gTables[tableNum].tableName;
    var deferred = jQuery.Deferred();

    var sqlOptions = {"operation": "deleteTable",
                      "tableName": tableName};

    deleteTable(tableNum, null, null, sqlOptions)
    .then(function() {
        setTimeout(function() {
            if (gTables[gActiveTableNum] &&
                gTables[gActiveTableNum].resultSetCount !== 0) {  
                generateFirstVisibleRowNum();
            }
        }, 300);

        deferred.resolve();
    })
    .fail(deferred.reject);

    return (deferred.promise());
}

function deleteTable(tableNum, tableName, deleteArchived, sqlOptions) {
    var deferred = jQuery.Deferred();
    var table = deleteArchived ? gHiddenTables[tableNum] : gTables[tableNum];
    var tableName = tableName || table.tableName;
    var resultSetId;
    if (tableNum === undefined) {
        resultSetId = -1;
    } else {
        resultSetId = table.resultSetId;
    }
    
    // Free the result set pointer that is still pointing to it
    XcalarSetFree(resultSetId)
    .then(function() {
        // check if table also in other workbooks
        return (WKBKManager.canDelTable(tableName));
    })
    .then(function(canDelete) {
        if (!canDelete) {
            return (promiseWrapper(null));
        } else {
            // check if it is the only table in this workbook
            for (var i = 0; i < gTables.length; i++) {
                if (gTables[i].tableName === tableName &&
                    (deleteArchived || i !== tableNum)) {
                    console.log("delete copy table");
                    return (promiseWrapper(null));
                }
            }

            for (var i = 0; i < gHiddenTables.length; i++) {
                if (gHiddenTables[i].tableName === tableName &&
                    (!deleteArchived || i !== tableNum)) {
                    console.log("delete copy table");
                    return (promiseWrapper(null));
                }
            }

            return (XcalarDeleteTable(tableName, sqlOptions));
        }
    })
    .then(function() {
        // XXX if we'd like to hide the cannot delete bug,
        // copy it to the fail function

        // Basically the same as archive table, but instead of moving to
        // gHiddenTables, we just delete it from gTablesIndicesLookup
        if (deleteArchived) {
            gHiddenTables.splice((tableNum), 1);
            delete (gTableIndicesLookup[tableName]);
        } else {
            archiveTable(tableNum, DeleteTable.Delete);
        }

        WSManager.removeTable(tableName);

        deferred.resolve();
    })
    .fail(function(error){
        deferred.reject(error);
    });

    return (deferred.promise());
}

// get meta data about table
function setTableMeta(tableName) {
    var deferred = jQuery.Deferred();

    var newTable     = new TableMeta();
    var lookupTable  = gTableIndicesLookup[tableName];


    newTable.tableCols = [];
    newTable.currentRowNumber = 0;

    if (lookupTable) {
        newTable.rowHeights = lookupTable.rowHeights;
        newTable.bookmarks = lookupTable.bookmarks;
    }

    getResultSet(tableName)
    .then(function(resultSet) {
        newTable.resultSetId = resultSet.resultSetId;

        newTable.resultSetCount = resultSet.numEntries;
        newTable.resultSetMax = resultSet.numEntries;
        newTable.numPages = Math.ceil(newTable.resultSetCount /
                                      gNumEntriesPerPage);
        newTable.tableName = tableName;
        newTable.keyName = resultSet.keyAttrHeader.name;

        deferred.resolve(newTable);
    })
    .fail(function(error){
        console.error("setTableMeta Fails!", error);
        deferred.reject(error);
    });

    return (deferred.promise());

    // Constructor for table meata data
    function TableMeta() {
        this.tableCols = null;
        this.currentRowNumber = -1;
        this.resultSetId = -1;
        this.keyName = "";
        this.tableName = "";
        this.resultSetCount = -1;
        this.numPages = -1;
        this.bookmarks = [];
        this.rowHeights = {};
        return (this);
    }
}

// start the process of building table
function startBuildTable(tableNum, tableNumsToRemove) {
    var deferred   = jQuery.Deferred();
    var table      = gTables[tableNum];
    var tableName = table.tableName;
    var progCols   = getIndex(tableName);
    var notIndexed = !(progCols && progCols.length > 0);

    getFirstPage(table.resultSetId, tableName, notIndexed)
    .then(function(jsonObj, keyName) {
        if (notIndexed) { // getNextPage will ColManager.setupProgCols()
            progCols = table.tableCols;
        }

        if (tableNumsToRemove) {
            for (var i = 0, len = tableNumsToRemove.length; i < len; i++) {
                var tableNumber = tableNumsToRemove[i];
                $('#tablesToRemove' + tableNumber).remove();
                $('#rowScrollerToRemove' + tableNumber).remove();
                $('#dagWrapToRemove' + tableNumber).remove();
            }
        }
        tableNum = xcHelper.getTableIndexFromName(tableName) || 0;
        table.currentRowNumber = jsonObj.normal.length;
        buildInitialTable(progCols, tableNum, jsonObj, keyName);
        deferred.resolve();
    })
    .then(function() {
        var requiredNumRows    = Math.min(60, table.resultSetCount);
        var numRowsStillNeeded = requiredNumRows -
                                 $('#xcTable' + tableNum + ' tbody tr').length;

        if (numRowsStillNeeded > 0) {
            var info = {
                "numRowsToAdd"    : numRowsStillNeeded,
                "numRowsAdded"    : 0,
                "targetRow"       : table.currentRowNumber + numRowsStillNeeded,
                "lastRowToDisplay": table.currentRowNumber + numRowsStillNeeded,
                "bulk"            : false,
                "dontRemoveRows"  : true,
                "tableName"       : tableName
            };

            return goToPage(table.currentRowNumber, numRowsStillNeeded,
                            RowDirection.Bottom, false, info)
                    .then(function() {
                        tableNum = xcHelper.getTableIndexFromName(tableName);
                        var lastRow = $('#xcTable' + tableNum + ' tr:last');
                        var lastRowNum = parseInt(lastRow.attr('class')
                                                         .substr(3));
                        table.currentRowNumber = lastRowNum + 1;
                    });
        }
    })
    .fail(function(error) {
        console.error("startBuildTable fails!", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function buildInitialTable(progCols, tableNum, jsonObj, keyName) {
    var table = gTables[tableNum];
    table.tableCols = progCols;
    table.keyName = keyName;
    var dataIndex = generateTableShell(table.tableCols, tableNum);
    var numRows = jsonObj.normal.length;
    var startIndex = 0;
    var $table = $('#xcTable' + tableNum);
    addRowScroller(tableNum);
    if (numRows === 0) {
        console.log('no rows found, ERROR???');
        $('#rowScroller' + tableNum).addClass('hidden');
        $table.addClass('emptyTable');
        jsonObj = {
            "normal" : [""],
            "withKey": [""]
        };
    }

    pullRowsBulk(tableNum, jsonObj, startIndex, dataIndex, null);
    addTableListeners(tableNum);
    createTableHeader(tableNum);
    generateColDropDown(tableNum);
    addColListeners($table, tableNum);

    if (numRows === 0) {
        $table.find('.idSpan').text("");
    }
}

function pullRowsBulk(tableNum, jsonObj, startIndex, dataIndex, direction,
                        rowToPrependTo) {
    // this function does some preparation for ColManager.pullAllCols()
    startIndex = startIndex || 0;
    var $table = $('#xcTable' + tableNum);
    // get the column number of the datacolumn
    if (dataIndex == null) {
        dataIndex = xcHelper.parseColNum($('#xcTable' + tableNum)
                                            .find('tr:first .dataCol')) - 1;
    }
    var newCells = ColManager.pullAllCols(startIndex, jsonObj, dataIndex,
                                          tableNum, direction, rowToPrependTo);
    addRowListeners(newCells);
    adjustRowHeights(newCells, startIndex, tableNum);

    var idColWidth = getTextWidth($table.find('tr:last td:first'));
    var newWidth = Math.max(idColWidth, 22);
    var padding = 12;
    $table.find('th:first-child').width(newWidth + padding);
    var colNum = 0;
    matchHeaderSizes(colNum, $table);
    $table.find('.rowGrab').width($table.width());
}

function generateTableShell(columns, tableNum) {
    var table = gTables[tableNum];
    var activeWS = WSManager.getActiveWS();
    var tableWS = WSManager.getWSFromTable(table.tableName);
    var activeClass = "";
    if (activeWS !== tableWS) {
        activeClass = 'inActive';
    }
    var wrapper =
        '<div id="xcTableWrap' + tableNum + '"' +
            ' class="xcTableWrap tableWrap ' + activeClass + '">' +
            '<div id="xcTbodyWrap' + tableNum + '" class="xcTbodyWrap"></div>' +
        '</div>';
    // creates a new table, completed thead, and empty tbody
    if (tableNum === 0) {
        $('#mainFrame').prepend(wrapper);
    } else {
        $('#xcTableWrap' + (tableNum - 1)).after(wrapper);
    }

    var newTable =
        '<table id="xcTable' + tableNum + '" class="xcTable dataTable" ' +
        'style="width:0px;">' +
          '<thead>' +
          '<tr>' +
            '<th style="width: 50px;" class="col0 th rowNumHead">' +
              '<div class="header">' +
                '<input value="" readonly="" tabindex="-1">' +
              '</div>' +
            '</th>';
    var numCols = columns.length;
    var dataIndex = null;

    for (var i = 0; i < numCols; i++) {
        var color = "";
        var columnClass = "";
        var backName = "";

        if (columns[i].func.args && columns[i].func.args[0]) {
            backName = columns[i].func.args[0];
        } else {
            backName = columns[i].name;
        }

        if (backName === table.keyName) {
            columnClass = " indexedColumn";
        } else if (columns[i].name === "" || columns[i].func.func === "") {
            columnClass = " newColumn";
        }
        if (backName === "DATA") {
            dataIndex = i;
            var newColid = i + 1;
            newTable +=
                '<th class="col' + newColid + ' th dataCol" ' +
                    'style="width:' + columns[i].width + 'px;">' +
                    '<div class="header type-data">' +
                        '<div class="dragArea"></div>' +
                        '<div class="colGrab"></div>' +
                        '<div class="flexContainer flexRow">' +
                        '<div class="flexWrap flex-left"></div>' +
                        '<div class="flexWrap flex-mid">' +
                            '<input value="DATA" readonly="" tabindex="-1"' +
                                ' class="dataCol col' + newColid +
                                ' data-toggle="tooltip" data-placement="bottom" ' +
                                '" title="raw data">' +
                        '</div>' +
                        '<div class="flexWrap flex-right">' +
                            '<div class="dropdownBox">' +
                                '<div class="innerBox"></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</th>';
        } else {
            newTable += generateColumnHeadHTML(columnClass, color,
                       (i + 1), columns[i]);
        }  
    }

    newTable += '</tr></thead><tbody></tbody></table>';
    $('#xcTbodyWrap' + tableNum).append(newTable);
    return (dataIndex);
}

function reorderTables(tableNum) {
    for (var i = gTables.length - 1; i >= tableNum; i--) {
        $("#xcTableWrap" + i).attr("id", "xcTableWrap" + (i + 1));
        $("#xcTheadWrap" + i).attr("id", "xcTheadWrap" + (i + 1));
        $("#xcTbodyWrap" + i).attr("id", "xcTbodyWrap" + (i + 1));
        $("#xcTable" + i).attr("id", "xcTable" + (i + 1));
        $("#tableMenu" + i).attr("id", "tableMenu" + (i + 1));
        $("#rowScroller" + i).attr("id", "rowScroller" + (i + 1));
        $("#rowMarker" + i).attr("id", "rowMarker" + (i + 1));
        $("#colMenu" + i).attr("id", "colMenu" + (i + 1));
        $("#dagWrap" + i).attr("id", "dagWrap" + (i + 1));
        gTables[i + 1] = gTables[i];
    }
}

function generateColumnHeadHTML(columnClass, color, newColid, option) {
    option = option || {};

    var columnName = option.name || "newCol";
    var width      = option.width || 0;
    var tooltip    = columnClass.indexOf("indexedColumn") < 0 ? "" :
                     ' title="Indexed Column" data-toggle="tooltip" ' +
                     'data-placement="top" data-container="body"';
    var columnHeadTd =
        '<th class="th' + color + columnClass +
        ' col' + newColid + '" style="width:' + width + 'px;">' +
            '<div class="header">' +
                '<div class="dragArea">' +
                    '<div class="iconHelper" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" ' +
                        'data-container="body">' +
                    '</div>' +
                '</div>' +
                '<div class="colGrab" ' +
                     'title="Double click to <br />auto resize" ' +
                     'data-toggle="tooltip" ' +
                     'data-container="body" ' +
                     'data-placement="left">' +
                '</div>' +
                '<div class="flexContainer flexRow">' +
                    '<div class="flexWrap flex-left">' +
                    // XXX keep a space for hiding the icon in hide
                        '<div class="iconHidden"></div> ' +
                        '<span class="type icon"></span>' +
                    '</div>' +
                    '<div class="flexWrap flex-mid"' + tooltip + '>' +
                        '<input autocomplete="on" spellcheck="false" ' +
                            'type="text" class="editableHead col' + newColid +
                            '" data-toggle="tooltip" data-placement="bottom" ' +
                            'title="click to edit" value="' + columnName +
                            '" size="15" placeholder=""/>' +
                    '</div>' +
                    '<div class="flexWrap flex-right">' +
                        '<div class="dropdownBox" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="bottom" ' +
                            'data-container="body" ' +
                            'title="view column options">' +
                            '<div class="innerBox"></div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</th>';

    return (columnHeadTd);
}

function generateColDropDown(tableNum) {
    var types = ['Boolean', 'Integer', 'Decimal', 'String'];
    var dropDownHTML =
        '<ul id="colMenu' + tableNum + '" class="colMenu">' +
            '<li class="thDropdown">' +
                'Add a column' +
                '<ul class="subColMenu">' +
                    '<li class="addColumns addColLeft">' +
                    'On the left</li>' +
                    '<li class="addColumns">On the right</li>' +
                    '<div class="subColMenuArea"></div>' +
                '</ul>' +
                '<div class="dropdownBox"></div>' +
            '</li>' +
            '<li class="deleteColumn thDropdown">Delete column</li>' +
            '<li class="duplicate thDropdown">Duplicate column</li>' +
            '<li class="deleteDuplicates thDropdown">' +
                'Delete other duplicates' +
            '</li>' +
            '<li class="renameCol thDropdown">Rename column</li>' +
            '<li class="hide thDropdown">Hide column</li>' +
            '<li class="unhide thDropdown">Unhide column</li>' +
            '<li class="thDropdown">Text align' +
                '<ul class="subColMenu">' +
                    '<li class="textAlign leftAlign">Left Align</li>' +
                    '<li class="textAlign centerAlign">Center Align</li>' +
                    '<li class="textAlign rightAlign">Right Align</li>' +
                    '<div class="subColMenuArea"></div>' +
                '</ul>' +
                '<div class="dropdownBox"></div>' +
            '</li>' +
            '<li class="changeDataType thDropdown">Change data type' +
                '<ul class="subColMenu">';

    types.forEach(function(type) {
        dropDownHTML +=
            '<li class="flexContainer flexRow typeList type-' +
                type.toLowerCase() + '">' +
                '<div class="flexWrap flex-left">' +
                    '<span class="type icon"></span>' +
                '</div>' +
                '<div class="flexWrap flex-right">' +
                    '<span class="label">' + type + '</span>' +
                '</div>' +
            '</li>';
    });

    dropDownHTML +=
            '<div class="subColMenuArea"></div>' +
        '</ul>' +
        '<div class="dropdownBox"></div>' +
    '</li>' +
    '<li class="sort thDropdown">Sort' +
        '<ul class="subColMenu">' +
            '<li class="sort" ' +
                'title="Table is already sorted <br/> on this column" ' +
                'data-toggle="tooltip" ' +
                'data-container="#colMenu' + tableNum + ' .sort.thDropdown" ' +
                'data-placement="top">' +
            '<span class="sortUp"></span>A-Z</li>' +
            '<li class="revSort unavailable">' +
            '<span class="sortDown"></span>Z-A</li>' +
            '<div class="subColMenuArea"></div>' +
        '</ul>' +
        '<div class="dropdownBox"></div>' +
    '</li>' +
    '<li class="functions aggregate thDropdown">Aggregate...</li>' +
    '<li class="functions filter thDropdown">Filter...</li>' +
    '<li class="functions groupby thDropdown">Group By...</li>' +
    '<li class="functions map thDropdown">Map...</li>' +
    '<li class="joinList thDropdown">Join...</li>' +
    '<li class="tdFilter tdDropdown">Filter this value</li>' +
    '<li class="tdExclude tdDropdown">Exclude this value</li>';


    // XXX: HACK: I removed the check for the main col. Also, I should check for
    // whether the type is a string or a int
    // if (true) { // This check is here so that you don't have to indent in the
    //             // in the future. O:D
    //     dropDownHTML +=
    //         '<li class="joinList">' + 'Join</li>' +
    //         '<li class="operations">' + 'Functions</li>';
    //                         // '<ul class="subColMenu" id="joinTables">';
    // }
    // dropDownHTML += '</ul><div class="dropdownBox"></div>' +
    //                 '<div class="subColMenuArea"></div></li>';
    dropDownHTML += '</ul>';
    $('#xcTableWrap' + tableNum).append(dropDownHTML);

    return (dropDownHTML);
}
