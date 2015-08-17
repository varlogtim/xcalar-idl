function refreshTable(newTableName, oldTableName, options) {
    var deferred = jQuery.Deferred();
    options = options || {};

    var focusWorkspace = options.focusWorkspace;
    var additionalTableName = options.additionalTableName;
    var keepOriginal = options.keepOriginal;
    var lockTable = options.lockTable;

    if (focusWorkspace) {
        if (!$('#workspaceTab').hasClass('active')) {
            $("#workspaceTab").trigger('click');

            if ($('#dagPanel').hasClass('full') &&
                !$('#dagPanel').hasClass('hidden'))
            {
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
                var tableId = xcHelper.getTableId(newTableName);
                focusTable(tableId);
                var leftPos = $('#xcTableWrap-' + tableId).position().left +
                                $('#mainFrame').scrollLeft();
                $('#mainFrame').animate({scrollLeft: leftPos})
                               .promise()
                               .then(function() {
                                    focusTable(tableId);
                                });
            }
            
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("refreshTable fails!");
            deferred.reject(error);
        });
    } else {
        // default
        var targetTable = oldTableName;
        var targetTableId = xcHelper.getTableId(oldTableName);
        var tablesToRemove = [];
        // var delayTableRemoval = true;
        var tableToRemove;

        if (additionalTableName) {
            var addTableId = xcHelper.getTableId(additionalTableName);
            var firstTablePos  = WSManager.getTablePosition(targetTableId);
            var secondTablePos = WSManager.getTablePosition(addTableId);

            if (firstTablePos > secondTablePos) {
                targetTable = additionalTableName;
                tableToRemove = targetTableId;
            } else {
                targetTable = oldTableName;
                tableToRemove = addTableId;
            }

            tablesToRemove.push(tableToRemove);

            if (firstTablePos !== secondTablePos) {
                // if targetTableId == tableToRemove, it's self, join
                // no need to push the secondTableToRemove
                var secondTableId = xcHelper.getTableId(targetTable);
                tablesToRemove.push(secondTableId);
            }
        } else {
            tablesToRemove.push(targetTableId);
        }

        addTable(newTableName, targetTable, AfterStartup.After,
                tablesToRemove, lockTable)
        .then(function() {
            if ($('.tblTitleSelected').length === 0) {
                var tableId = xcHelper.getTableId(newTableName);
                focusTable(tableId);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("refreshTable fails!");
            deferred.reject(error);
        });
    }
    return (deferred.promise());
}

// Adds a table to the display
// Shifts all the ids and everything
function addTable(tableName, oldTableName, afterStartup, tablesToRemove, lockTable) {
    // var deferred = jQuery.Deferred();
    var tableId  = xcHelper.getTableId(tableName);
    var oldId;

    if (oldTableName == null) {
        WSManager.replaceTable(tableId);
    } else {
        oldId = xcHelper.getTableId(oldTableName);
        var tablePosition = WSManager.getTablePosition(oldId);

        if (tablePosition > -1) {
            WSManager.replaceTable(tableId, oldId, tablesToRemove);
        } else {
            WSManager.replaceTable(tableId);
        }
    }

    // WSManager.replaceTable need to know oldTable's location
    // so remove table after that
    if (tablesToRemove) {
        var delayTableRemoval = true;
        for (var i = 0; i < tablesToRemove.length; i++) {
            if (gTables[tablesToRemove[i]].active) {
                archiveTable(tablesToRemove[i], ArchiveTable.Keep, delayTableRemoval);
            }
        }
    }

    if (lockTable) {
        // replace just the ids instead of the entire table so we won't
        // see the flicker of intermediate tables

        if (oldId == null) {
            oldId = xcHelper.getTableId(oldTableName);
        }

        $("#xcTableWrap-" + oldId).removeClass("tableToRemove")
                            .find(".tableTitle .hashName").text(tableId);
        $("#rowScroller-" + oldId).attr('id', 'rowScroller-' + tableId)
                                .removeClass("rowScrollerToRemove");
        $('#dagWrap-' + oldId).attr('id', 'dagWrap-' + tableId)
                            .removeClass("dagWrapToRemove");
        changeTableId(oldId, tableId);

        var table    = xcHelper.getTableFromId(tableId);
        var progCols = getIndex(table.tableName);

        table.tableCols = progCols;
        RightSideBar.addTables([table], IsActive.Active);
        return (promiseWrapper(null));
    } else {
        return (parallelConstruct(tableId, tablesToRemove, afterStartup));
    }
}

function changeTableId(oldId, newId) {
    $("#xcTableWrap-" + oldId).attr('id', 'xcTableWrap-' + newId)
                                .attr("data-id", newId);
    $("#xcTheadWrap-" + oldId).attr('id', 'xcTheadWrap-' + newId)
                                .attr("data-id", newId);
    $("#xcTbodyWrap-" + oldId).attr('id', 'xcTbodyWrap-' + newId)
                                .attr("data-id", newId);
    $("#xcTable-" + oldId).attr('id', 'xcTable-' + newId)
                            .attr("data-id", newId);
    $("#tableMenu-" + oldId).attr('id', 'tableMenu-' + newId)
                            .attr("data-id", newId);
    $("#colMenu-" + oldId).attr('id', 'colMenu-' + newId)
                            .attr("data-id", newId);
}

function parallelConstruct(tableId, tablesToRemove, afterStartup) {
    var table = xcHelper.getTableFromId(tableId);
    var deferred  = jQuery.Deferred();
    var deferred1 = startBuildTable(tableId, tablesToRemove);
    var deferred2 = Dag.construct(tableId);

    jQuery.when(deferred1, deferred2)
    .then(function() {
        var wsIndex = WSManager.getWSFromTable(tableId);
        var $xcTableWrap = $('#xcTableWrap-' + tableId);
        $xcTableWrap.addClass("worksheet-" + wsIndex);
        $("#dagWrap-" + tableId).addClass("worksheet-" + wsIndex);

        if (table.resultSetCount !== 0) {
            infScrolling(tableId);
        }

        RowScroller.resize();

        if ($('#mainFrame').hasClass('empty')) {
            // first time to create table
            $('#mainFrame').removeClass('empty');
        }
        if (afterStartup) {
            RightSideBar.addTables([table], IsActive.Active);
        }
        if ($('.xcTable').length === 1) {
            focusTable(tableId);
        }

        deferred.resolve();
    })
    .fail(deferred.reject);

    return (deferred.promise());
}

// Removes a table from the display
// Shifts all the ids
// Does not delete the table from backend!
function archiveTable(tableId, del, delayTableRemoval) {
    if (delayTableRemoval) {
        $("#xcTableWrap-" + tableId).addClass('tableToRemove');
        $("#rowScroller-" + tableId).addClass('rowScrollerToRemove');
        $("#dagWrap-" + tableId).addClass('dagWrapToRemove');
    } else {
        $("#xcTableWrap-" + tableId).remove();
        $("#rowScroller-" + tableId).remove();
        $('#dagWrap-' + tableId).remove();
    }

    if (!del) {
        gTables[tableId].active = false;
        gTables[tableId].timeStamp = xcHelper.getTimeInMS();
        gTables[tableId].active = false;
        WSManager.archiveTable(tableId);
        RightSideBar.moveTable(tableId);
    } else {
        var $li = $("#activeTablesList").find('.tableInfo[data-id="'
                                                + tableId + '"]');
        var $timeLine = $li.closest(".timeLine");

        $li.remove();
        if ($timeLine.find('.tableInfo').length === 0) {
            $timeLine.remove();
        }
    }
    // $('#rowInput').val("").data('val',"");
    gActiveTableId = null;
    if ($('.xcTableWrap.active').length === 0) {
        RowScroller.empty();
    }

    moveTableDropdownBoxes();
    moveTableTitles();
}

function deleteOrphaned(tableName) {
    var deferred = jQuery.Deferred();

    var sqlOptions = {
        "operation": "deleteTable",
        "tableName": tableName,
        "tableType": TableType.Orphan
    };

    XcalarDeleteTable(tableName, sqlOptions)
    .then(function() {
        var tableIndex = gOrphanTables.indexOf(tableName);
        gOrphanTables.splice(tableIndex, 1);
        Dag.makeInactive(tableName, true);
        deferred.resolve();
    })
    .fail(deferred.reject);

    return (deferred.promise());
}

function deleteTable(tableIdOrName, tableType) {
    if (tableType === TableType.Orphan) {
        // delete orphaned
        return (deleteOrphaned(tableIdOrName));
    }

    // delete active or inactive table;
    var tableId = tableIdOrName;

    if (tableId == null) {
        console.warn("DeleteTable: Table Id cannot be null!");
        return (promiseWrapper(null));
    }

    var deferred    = jQuery.Deferred();
    var table       = gTables[tableId];
    var tableName   = table.tableName;
    var resultSetId = table.resultSetId;

    var sqlOptions = {
        "operation": "deleteTable",
        "tableName": tableName,
        "tableType": tableType
    };
    
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
            // The following logic can be uncommented when we reenable copy
            // to worksheet. However, this time, we should have # after the
            // table name to distinguish between the two tables. This removes
            // our need to rely on tableNum
            /**
            for (var i = 0; i < gTables.length; i++) {
                if (getTNPrefix(gTables[i].tableName) ===
                    getTNPrefix(tableName) &&
                    (deleteArchived || getTNSuffix(gTables[i].tableName) !==
                                       getTNSuffix(tableName))) {
                    console.log("delete copy table");
                    return (promiseWrapper(null));
                }
            }

            for (var i = 0; i < gHiddenTables.length; i++) {
                if (getTNPrefix(gHiddenTables[i].tableName) ===
                    getTNPrefix(tableName) &&
                    (deleteArchived || getTNSuffix(gTables[i].tableName) !==
                                       getTNSuffix(tableName))) {
                    console.log("delete copy table");
                    return (promiseWrapper(null));
                }
            }
            */
            return (XcalarDeleteTable(tableName, sqlOptions));
        }
    })
    .then(function() {
        // XXX if we'd like to hide the cannot delete bug,
        // copy it to the fail function
        WSManager.removeTable(tableId);
        Dag.makeInactive(tableId);
        delete gTables[tableId];

        if (tableType === TableType.Active) {
            // when delete active table
            archiveTable(tableId, ArchiveTable.Delete);

            setTimeout(function() {
                var activeTable = gTables[gActiveTableId];
                if (activeTable && activeTable.resultSetCount !== 0) { 
                    generateFirstVisibleRowNum();
                }
            }, 300);
        }

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
    var tableId  = xcHelper.getTableId(tableName);
    var newTable = gTables[tableId];

    newTable.currentRowNumber = 0;

    getResultSet(tableName)
    .then(function(resultSet) {
        newTable.resultSetId = resultSet.resultSetId;

        newTable.resultSetCount = resultSet.numEntries;
        newTable.resultSetMax = resultSet.numEntries;
        newTable.numPages = Math.ceil(newTable.resultSetCount /
                                      gNumEntriesPerPage);
        newTable.tableName = tableName;
        newTable.tableId = xcHelper.getTableId(tableName);
        newTable.keyName = resultSet.keyAttrHeader.name;

        deferred.resolve(newTable);
    })
    .fail(function(error){
        console.error("setTableMeta Fails!", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

 // Constructor for table meata data
function TableMeta() {
    this.tableCols = null;
    this.currentRowNumber = -1;
    this.resultSetId = -1;
    this.keyName = "";
    this.tableName = "";
    this.tableId = "";
    this.resultSetCount = -1;
    this.numPages = -1;
    this.bookmarks = [];
    this.rowHeights = {};
    this.active = true;
    return (this);
}

// start the process of building table
function startBuildTable(tableId, tablesToRemove) {
    var deferred   = jQuery.Deferred();
    var table      = xcHelper.getTableFromId(tableId);
    var tableName  = table.tableName;
    var progCols   = gTables[tableId].tableCols;
    var notIndexed = !(progCols && progCols.length > 0);

    getFirstPage(table, notIndexed)
    .then(function(jsonObj, keyName) {
        if (notIndexed) { // getNextPage will ColManager.setupProgCols()
            progCols = table.tableCols;
        }

        if (tablesToRemove) {
            for (var i = 0, len = tablesToRemove.length; i < len; i++) {
                var tblId = tablesToRemove[i];
                $("#xcTableWrap-" + tblId).remove();
                $("#rowScroller-" + tblId).remove();
                $('#dagWrap-' + tblId).remove();
            }
        }
        table.currentRowNumber = jsonObj.normal.length;
        buildInitialTable(progCols, tableId, jsonObj, keyName);
        deferred.resolve();
    })
    .then(function() {
        var $table = $('#xcTable-' + tableId);
        var requiredNumRows    = Math.min(60, table.resultSetCount);
        var numRowsStillNeeded = requiredNumRows -
                                 $table.find('tbody tr').length;

        if (numRowsStillNeeded > 0) {
            var info = {
                "numRowsToAdd"    : numRowsStillNeeded,
                "numRowsAdded"    : 0,
                "targetRow"       : table.currentRowNumber + numRowsStillNeeded,
                "lastRowToDisplay": table.currentRowNumber + numRowsStillNeeded,
                "bulk"            : false,
                "dontRemoveRows"  : true,
                "tableName"       : tableName,
                "tableId"         : tableId
            };

            return goToPage(table.currentRowNumber, numRowsStillNeeded,
                            RowDirection.Bottom, false, info)
                    .then(function() {
                        var lastRow = $table.find('tr:last');
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

function buildInitialTable(progCols, tableId, jsonObj, keyName) {
    var table = xcHelper.getTableFromId(tableId);
    table.tableCols = progCols;
    table.keyName = keyName;
    var dataIndex = generateTableShell(table.tableCols, tableId);
    var numRows = jsonObj.normal.length;
    var startIndex = 0;
    var $table = $('#xcTable-' + tableId);
    RowScroller.add(tableId);
    if (numRows === 0) {
        console.log('no rows found, ERROR???');
        $('#rowScroller-' + tableId).addClass('hidden');
        $table.addClass('emptyTable');
        jsonObj = {
            "normal" : [""],
            "withKey": [""]
        };
    }

    pullRowsBulk(tableId, jsonObj, startIndex, dataIndex, null);
    addTableListeners(tableId);
    createTableHeader(tableId);
    generateColDropDown(tableId);
    addColListeners($table, tableId);

    if (numRows === 0) {
        $table.find('.idSpan').text("");
    }
}

function pullRowsBulk(tableId, jsonObj, startIndex, dataIndex, direction,
                        rowToPrependTo) {
    // this function does some preparation for ColManager.pullAllCols()
    startIndex = startIndex || 0;
    var $table = $('#xcTable-' + tableId);
    // get the column number of the datacolumn
    if (dataIndex == null) {
        dataIndex = xcHelper.parseColNum($table.find('tr:first .dataCol')) - 1;
    }
    var newCells = ColManager.pullAllCols(startIndex, jsonObj, dataIndex,
                                          tableId, direction, rowToPrependTo);
    addRowListeners(newCells);
    adjustRowHeights(newCells, startIndex, tableId);

    var idColWidth = getTextWidth($table.find('tr:last td:first'));
    var newWidth = Math.max(idColWidth, 22);
    var padding = 12;
    $table.find('th:first-child').width(newWidth + padding);
    var colNum = 0;
    matchHeaderSizes(colNum, $table);
    $table.find('.rowGrab').width($table.width());
}

function generateTableShell(columns, tableId) {
    var table = gTables[tableId];
    var activeWS = WSManager.getActiveWS();
    var tableWS = WSManager.getWSFromTable(tableId);
    var activeClass = "";
    if (activeWS !== tableWS) {
        activeClass = 'inActive';
    }
    var wrapper =
        '<div id="xcTableWrap-' + tableId + '"' +
            ' class="xcTableWrap tableWrap ' + activeClass + '" ' +
            'data-id="' + tableId + '">' +
            '<div id="xcTbodyWrap-' + tableId + '" class="xcTbodyWrap" ' +
            'data-id="' + tableId + '"></div>' +
        '</div>';
    // creates a new table, completed thead, and empty tbody
    var position = WSManager.getTablePosition(tableId);

    if (position === 0) {
        $('#mainFrame').prepend(wrapper);
    } else {
        var $prevTable = $('.xcTableWrap:not(.tableToRemove)').eq(position - 1);
        if ($prevTable.length !== 0) {
            $prevTable.after(wrapper);
        } else {
            console.error('Table not appended to the right spot, big problem!');
            $('#mainFrame').append(wrapper);
        }
        // we exclude any tables pending removal because otherwise we wouldn't
        // be placing the new table is the proper position
    }

    var newTable =
        '<table id="xcTable-' + tableId + '" class="xcTable dataTable" ' +
        'style="width:0px;" data-id="' + tableId + '">' +
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
            var width;
            if (columns[i].isHidden) {
                width = 15;
            } else {
                width = columns[i].width;
            }
            newTable +=
                '<th class="col' + newColid + ' th dataCol" ' +
                    'style="width:' + width + 'px;">' +
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
    $('#xcTbodyWrap-' + tableId).append(newTable);
    return (dataIndex);
}

function generateColumnHeadHTML(columnClass, color, newColid, option) {
    option = option || {};

    var columnName = option.name || "newCol";
    var width      = option.width || 0;
    if (option.isHidden) {
        width = 15;
    }

    var tooltip = columnClass.indexOf("indexedColumn") < 0 ? "" :
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
                        '<input class="editableHead col' + newColid + '"' +
                            ' type="text"  value="' + columnName + '"' +
                            ' size="15" readonly/>' +
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

function generateColDropDown(tableId) {
    // XX need to get rid of tableNum here
    var types = ['Boolean', 'Integer', 'Decimal', 'String'];
    var dropDownHTML =
        '<ul id="colMenu-' + tableId + '" class="colMenu" ' +
        'data-id="' + tableId + '">' +
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
            '<li class="renameCol thDropdown">' +
                'Rename column' +
                '<ul class="subColMenu">' +
                    '<li style="text-align: center" class="clickable">' +
                        '<span>New Column Name</span>' +
                        '<div class="listSection">' +
                            '<input class="colName" type="text" width="100px"' +
                                ' autocomplete="on" spellcheck="false"/>' +
                        '</div>' +
                    '</li>' +
                    '<div class="subColMenuArea"></div>' +
                '</ul>' +
                '<div class="dropdownBox"></div>' +
            '</li>' +
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
                'data-container="#colMenu-' + tableId + ' .sort.thDropdown" ' +
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
    '<li class="profile thDropdown">Profile...</li>' +
    '<li class="multiColumn hideColumns thDropdown">Hide Columns</li>' +
    '<li class="multiColumn unhideColumns thDropdown">Unhide Columns</li>' +
    '<li class="multiColumn deleteColumns thDropdown">Delete Columns</li>' +
    '<li class="tdFilter tdDropdown">Filter this value</li>' +
    '<li class="tdExclude tdDropdown">Exclude this value</li>' +
    '<li class="tdJsonModal tdDropdown">Examine</li>' +
    '<li class="tdCopy tdDropdown">Copy to clipboard</li>';


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
    var $xcTableWrap = $('#xcTableWrap-' + tableId);
    $xcTableWrap.append(dropDownHTML);

    return (dropDownHTML);
}
