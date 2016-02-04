window.TblManager = (function($, TblManager) {

    /**
        This function takes in an array of newTable names to be added,
        an array of tableCols, worksheet that newTables will add to and an array
        of oldTable names that will be modified due to a function.
        Inside oldTables, if there is an anchor table, we move it to the start
        of the array. If there is a need for more than 1 piece of information,
        then oldTables need to be an array of structs
        Possible Options
            focusWorkspace: boolean to determine whether we should focus back on
                            workspace, we focus on workspace when adding a table
                            from the datastores panel
            lockTable: boolean, if true then this is an intermediate table that
                      will be locked throughout it's active life
            afterStartup: boolean, default is true. Set to false if tables are
                      being added during page load

    */
    TblManager.refreshTable = function(newTableNames, tableCols, oldTableNames,
                                       worksheet, options)
    {
        var deferred = jQuery.Deferred();

        options = options || {};
        oldTableNames = oldTableNames || [];

        var focusWorkspace = options.focusWorkspace;
        var lockTable = options.lockTable;
        var afterStartup;

        if (options.afterStartup == null) {
            afterStartup = true;
        } else {
            afterStartup = options.afterStartup;
        }

        var numOldTables = oldTableNames.length;
      

        // XX temp;
        var newTableName = newTableNames[0];
        var newTableId = xcHelper.getTableId(newTableName);

        // must get worksheet to add before async call,
        // otherwise newTable may add to wrong worksheet
        if (worksheet != null) {
            WSManager.addTable(newTableId, worksheet);
        }
        // the only case that worksheet is null is add from inActive list

        var setOptions = {
            "isActive"       : true,
            "tableProperties": options.tableProperties
        };
        TblManager.setgTable(newTableName, tableCols, setOptions)
        .then(function() {
            if (focusWorkspace) {
                focusOnWorkspace();
            }
            var addTableOptions;

            if (numOldTables) {
                // there are old tables we will replace
                var targetTable;
                var tablesToRemove = [];
                var oldTableIds = [];

                for (var i = 0, len = oldTableNames.length; i < len; i++) {
                    oldTableIds[i] = xcHelper.getTableId(oldTableNames[i]);
                }

                if (numOldTables < 2) {
                    // only have one table to remove
                    targetTable = oldTableNames[0];
                } else {
                    // find the first table in the worksheet,
                    // that is the target worksheet
                    var wsTables = WSManager.getWSById(worksheet).tables;
                    for (var i = 0, len = wsTables.length; i < len; i++) {
                        var index = oldTableIds.indexOf(wsTables[i]);
                        if (index >= 0) {
                            targetTable = oldTableNames[index];
                        }

                        break;
                    }

                    if (targetTable == null) {
                        // Actually we should not go to this part
                        // since we always get worksheet from one of old tables
                        // if it's really goes here, then replace with first one
                        console.error("Not Find Target Table!");
                        targetTable = oldTableNames[0];
                    }
                }

        
                for (var i = 0, len = oldTableIds.length; i < len; i++) {
                    var oldTableId = oldTableIds[i];
                    if (tablesToRemove.indexOf(oldTableId) < 0) {
                        // if oldTableId alredy exists (like self join)
                        // not add again
                        tablesToRemove.push(oldTableId);
                    }
                }

                addTableOptions = {
                    "afterStartup": afterStartup,
                    "lockTable"   : lockTable
                };
                addTable([newTableName], [targetTable], tablesToRemove,
                                    addTableOptions)
                .then(function() {
                    // highlight the table if no other tables in WS are selected
                    var wsNum = WSManager.getActiveWS();
                    if ($('.xcTableWrap.worksheet-' + wsNum).find('.tblTitleSelected')
                                                            .length === 0) {
                        var tableId = xcHelper.getTableId(newTableName);
                        focusTable(tableId);
                    }
                    deferred.resolve();
                })
                .fail(function(error) {
                    console.error("refreshTable fails!");
                    if (worksheet != null) {
                        WSManager.removeTable(newTableId);
                    }
                    deferred.reject(error);
                });
            } else {
                // append newly created table to the back, do not remove any tables
                addTableOptions = {
                    "afterStartup": afterStartup
                };
                addTable([newTableName], oldTableNames, [], addTableOptions)
                .then(function() {
                    if (focusWorkspace) {
                        scrollAndFocusTable(newTableName);
                    }
                    deferred.resolve();
                })
                .fail(function(error) {
                    console.error("refreshTable fails!");
                    if (worksheet != null) {
                        WSManager.removeTable(newTableId);
                    }
                    deferred.reject(error);
                });
            }
        })
        .fail(function(error) {
            console.log("set gTables fails!");
            if (worksheet != null) {
                WSManager.removeTable(newTableId);
            }
            deferred.reject(error);
        });
        
        return (deferred.promise());
    };

    /*
        This functions adds new tables to the display and the dag at the same
        time.
        
        Possible Options:
        afterStartup: boolean to indicate if the table is added after page load
    */
    TblManager.parallelConstruct = function (tableId, tablesToRemove, options) {
        options = options || {};
        var deferred  = jQuery.Deferred();
        var deferred1 = startBuildTable(tableId, tablesToRemove);
        var deferred2 = Dag.construct(tableId);
        var table = gTables[tableId];
        var addToTableList = options.afterStartup || false;

        jQuery.when(deferred1, deferred2)
        .then(function() {
            var wsId = WSManager.getWSFromTable(tableId);
            var $xcTableWrap = $('#xcTableWrap-' + tableId);
            $xcTableWrap.addClass("worksheet-" + wsId);
            $("#dagWrap-" + tableId).addClass("worksheet-" + wsId);

            if (table.resultSetCount !== 0) {
                infScrolling(tableId);
            }

            RowScroller.resize();

            if ($('#mainFrame').hasClass('empty')) {
                // first time to create table
                $('#mainFrame').removeClass('empty');
            }
            if (addToTableList) {
                var $existingTableList = $('#activeTablesList')
                                        .find('[data-id=' + table.tableId + ']');
                if ($existingTableList.length) {
                    $existingTableList.closest('.tableInfo')
                                      .removeClass('hiddenWS')
                                      .removeAttr('data-toggle data-container' +
                                                  'title data-original-title');
                } else {
                    TableList.addTables([table], IsActive.Active);
                }
                
            }
            if ($('.xcTable:visible').length === 1) {
                focusTable(tableId);
            }

            // disallow dragging if only 1 table in worksheet
            checkTableDraggable();

            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };

    /*
        Sets gTable meta data
        Possible Options:
        tableProperties: an object containing bookmarks and rowheights;

    */
    TblManager.setgTable = function(tableName, tableCols, options) {
        var deferred = jQuery.Deferred();
        var tableId = xcHelper.getTableId(tableName);
        options = options || {};
        var tableProperties = options.tableProperties;
        var isActive = options.isActive || false;

        var table = new TableMeta({
            "tableId"  : tableId,
            "tableName": tableName,
            "tableCols": tableCols
        });

        if (tableProperties) {
            table.bookmarks = tableProperties.bookmarks || [];
            table.rowHeights = tableProperties.rowHeights || {};
        }

        if (isActive) {
            // the table is in active worksheet, should have meta from backend
            table.currentRowNumber = 0;

            getResultSet(tableName)
            .then(function(resultSet) {
                table.updateFromResultset(resultSet);
                gTables[tableId] = table;
                deferred.resolve();
            })
            .fail(function(error) {
                console.error("setTableMeta Fails!", error);
                deferred.reject(error);
            });
        } else {
            // table is in inactive list or orphaned list, no backend meta
            gTables[tableId] = table;
            deferred.resolve();
        }

        return (deferred.promise());
    };

    /*
        Removes a table from the display and puts it in the rightside bar inactive
        list. Shifts all the ids. Does not delete the table from backend!
        
        Possible Options:
        del: boolean. If true, will delete the table (currently disabled),
            otherwise it will send table to inactive list
        delayTableRemoval: boolean. If true, special class will be added to
            table until it is removed later
        tempHide: boolean. If true, table is part of a hidden worksheet
    */
    TblManager.archiveTable = function(tableId, options) {
        options = options || {};
        var del = options.del || false;
        var delayTableRemoval = options.delayTableRemoval || false;
        var tempHide = options.tempHide || false;
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
            var table = gTables[tableId];
            // free result set when archieve
            table.freeResultset();
            table.beInActive();
            table.updateTimeStamp();
            WSManager.archiveTable(tableId, tempHide);
            TableList.moveTable(tableId);
        } else {
            var $li = $("#activeTablesList").find('.tableInfo[data-id="' +
                                                    tableId + '"]');
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
        moveFirstColumn();

        // disallow dragging if only 1 table in worksheet
        checkTableDraggable();
    };

    TblManager.deleteTable = function(tableIdOrName, tableType) {
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
            "operation": SQLOps.DeleteTable,
            "tableId"  : tableId,
            "tableName": tableName,
            "tableType": tableType
        };
        
        // Free the result set pointer that is still pointing to it
        XcalarSetFree(resultSetId)
        .then(function() {
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
        })
        .then(function() {
            // XXX if we'd like to hide the cannot delete bug,
            // copy it to the fail function
            WSManager.removeTable(tableId);
            Dag.makeInactive(tableId);
            delete gTables[tableId];

            if (tableType === TableType.Active) {
                // when delete active table
                TblManager.archiveTable(tableId, {del: ArchiveTable.Delete});

                setTimeout(function() {
                    var activeTable = gTables[gActiveTableId];
                    if (activeTable && activeTable.resultSetCount !== 0) {
                        generateFirstVisibleRowNum();
                    }
                }, 300);
            } else if (tableType === TableType.Agg) {
                // XXX as delete table is temporarily disabled
                // this case is not tested yet!
                TableList.removeAggTable(tableId);
            }

            deferred.resolve();
        })
        .fail(function(error){
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    TblManager.restoreTableMeta = function(tableId, oldMeta, failures) {
        var deferred = jQuery.Deferred();
        var table = new TableMeta(oldMeta);
        var tableName = table.tableName;

        if (table.isLocked) {
            table.isLocked = false;
            table.active = false;
        }

        if (table.active) {
            getResultSet(tableName)
            .then(function(resultSet) {
                table.updateFromResultset(resultSet);

                gTables[tableId] = table;
                deferred.resolve();
            })
            .fail(function(thriftError) {
                var error = "gTables initialization failed on " +
                            tableName + "fails: " + thriftError.error;
                failures.push(error);
                deferred.resolve(error);
            });
        } else {
            // when it's orphaned table or inactive table
            gTables[tableId] = table;
            deferred.resolve();
        }

        return (deferred.promise());
    };

    TblManager.pullRowsBulk = function(tableId, jsonObj, startIndex, dataIndex,
                                       direction, rowToPrependTo) {
        // this function does some preparation for ColManager.pullAllCols()
        startIndex = startIndex || 0;
        var $table = $('#xcTable-' + tableId);
        // get the column number of the datacolumn
        if (dataIndex == null) {
            dataIndex = xcHelper.parseColNum($table.find('tr:first .dataCol')) -
                                             1;
        }
        var newCells = ColManager.pullAllCols(startIndex, jsonObj, dataIndex,
                                              tableId, direction,
                                              rowToPrependTo);
        addRowListeners(newCells);
        adjustRowHeights(newCells, startIndex, tableId);

        var idColWidth = getTextWidth($table.find('tr:last td:first'));
        var newWidth = Math.max(idColWidth, 22);
        var padding = 12;
        $table.find('th:first-child').width(newWidth + padding);
        matchHeaderSizes($table);
        $table.find('.rowGrab').width($table.width());
    };

    TblManager.generateColumnHeadHTML = function(columnClass, color, newColid,
                                                  option) {
        option = option || {};

        var columnName = option.name || "";
        var width      = option.width || 0;
        if (option.isHidden) {
            width = 15;
            columnClass += " userHidden";
        }
        var readOnly = (columnName === "");
        var readOnlyProp;
        var readOnlyClass = "";
        if (readOnly) {
            readOnlyProp = "";
            readOnlyClass = " editable";
        } else {
            readOnlyProp = 'readonly tabindex="-1"';
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
                        // keep a space for hiding the icon in hide
                            '<div class="iconHidden"></div> ' +
                            '<span class="type icon"></span>' +
                        '</div>' +
                        '<div class="flexWrap flex-mid' + readOnlyClass +
                            '"' + tooltip + '>' +
                            '<input class="editableHead col' + newColid + '"' +
                                ' type="text"  value="' + columnName + '"' +
                                ' size="15" ' + readOnlyProp + '/>' +
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
    };

    TblManager.hideWorksheetTable = function(tableId) {
        $("#xcTableWrap-" + tableId).remove();
        $("#rowScroller-" + tableId).remove();
        $('#dagWrap-' + tableId).remove();

        if (gActiveTableId === tableId) {
            gActiveTableId = null;
        }
    };

    TblManager.hideTable = function(tableId) {
        $('#xcTableWrap-' + tableId).addClass('tableHidden');
        moveTableDropdownBoxes();
        moveFirstColumn();
        moveTableTitles();

        SQL.add("Hide Table", {
            "operation": SQLOps.HideTable,
            "tableName": gTables[tableId].tableName,
            "tableId"  : tableId
        });
    };

    TblManager.unHideTable = function(tableId) {
        $('#xcTableWrap-' + tableId).removeClass('tableHidden');
        WSManager.focusOnWorksheet(WSManager.getActiveWS(), false, tableId);
        moveTableDropdownBoxes();
        moveFirstColumn();
        moveTableTitles();

        var $table = $('#xcTable-' + tableId);
        $table.find('.rowGrab').width($table.width());

        SQL.add("UnHide Table", {
            "operation": SQLOps.UnhideTable,
            "tableName": gTables[tableId].tableName,
            "tableId"  : tableId
        });
    };

    TblManager.sortColumns = function(tableId, direction) {
        var table = gTables[tableId];
        var tableCols = table.tableCols;
        var order;
        var newIndex;
        if (direction === "reverse") {
            order = 1;
        } else {
            order = -1;
        }

        var numCols = tableCols.length;
        var dataCol;
        if (tableCols[numCols - 1].name === 'DATA') {
            dataCol = tableCols.splice(numCols - 1, 1)[0];
            numCols--;
        }

        // record original position of each column
        for (var i = 1; i <= numCols; i++) {
            tableCols[i - 1].index = i;
        }

        tableCols.sort(function(a, b) {
            a = a.name.toLowerCase();
            b = b.name.toLowerCase();

            // if a = "as1df12", return ["as1df12", "as1df", "12"]
            // if a = "adfads", return null
            var matchA = a.match(/(^.*?)([0-9]+$)/);
            var matchB = b.match(/(^.*?)([0-9]+$)/);

            if (matchA != null && matchB != null && matchA[1] === matchB[1]) {
                // if the rest part that remove suffix number is same,
                // compare the suffix number
                a = parseInt(matchA[2]);
                b = parseInt(matchB[2]);
            }

            if (a < b) {
                return (order);
            } else if (a > b) {
                return (-order);
            } else {
                return (0);
            }
        });

        var $table = $('#xcTable-' + tableId);
        var $rows = $table.find('tbody tr');
        var numRows = $rows.length;
        var oldColIndex;
        var newColIndex;
        // loop through each column
        for (var i = 0; i < numCols; i++) {
            oldColIndex = tableCols[i].index;
            newColIndex = i + 1;
            var $thToMove = $table.find('th.col' + oldColIndex);
            $thToMove.find('.col' + oldColIndex).removeClass('col' + oldColIndex)
                                                .addClass('col' + newColIndex);
            var oldPos = $thToMove.index();
            $table.find('th').eq(i).after($thToMove);
            // loop through each row and order each td
            for (var j = 0; j < numRows; j++) {
                var $row = $rows.eq(j);
                var $tdToMove = $row.find('td').eq(oldPos);
                $tdToMove.removeClass('col' + oldColIndex)
                         .addClass('col' + newColIndex);
                $row.find('td').eq(i).after($tdToMove);
            }
        }

        // correct gTable tableCols index and th col class number
        var $ths = $table.find('th');
        for (var i = 0; i < numCols; i++) {
            oldColIndex = tableCols[i].index;
            newIndex = i + 1;
            $ths.eq(newIndex).removeClass('col' + oldColIndex)
                             .addClass('col' + newIndex);
            delete tableCols[i].index;
        }

        if (dataCol) { // if data col was removed from sort, put it back
            tableCols.push(dataCol);
        }

        TableList.updateTableInfo(tableId);

        SQL.add("Sort Table Columns", {
            "operation": SQLOps.SortTableCols,
            "tableName": table.tableName,
            "tableId"  : tableId,
            "direction": direction
        });
    };

    TblManager.resizeColumns = function(tableId, resizeTo) {
        var sizeToHeader;
        var fitAll;

        switch (resizeTo) {
            case 'sizeToHeader':
                sizeToHeader = true;
                fitAll = false;
                break;
            case 'sizeToFitAll':
                sizeToHeader = true;
                fitAll = true;
                break;
            case 'sizeToContents':
                sizeToHeader = false;
                fitAll = false;
                break;
            default:
                throw "Error Case!";
        }

        var table   = gTables[tableId];
        var columns = table.tableCols;
        var $th;
        var $table = $('#xcTable-' + tableId);

        for (var i = 0, numCols = columns.length; i < numCols; i++) {
            $th = $table.find('th.col' + (i + 1));
            columns[i].sizeToHeader = !sizeToHeader;
            columns[i].isHidden = false;

            autosizeCol($th, {
                "dbClick"       : true,
                "minWidth"      : 17,
                "unlimitedWidth": false,
                "includeHeader" : sizeToHeader,
                "fitAll"        : fitAll,
                "multipleCols"  : true
            });
        }

        $table.find('.userHidden').removeClass('userHidden');
        matchHeaderSizes($table);

        SQL.add("Resize Columns", {
            "operation": SQLOps.ResizeTableCols,
            "tableName": table.tableName,
            "tableId"  : tableId,
            "resizeTo" : resizeTo
        });
    };

    function infScrolling(tableId) {
        var $rowScroller = $('#rowScrollerArea');
        var scrollCount = 0;
        var $xcTbodyWrap = $('#xcTbodyWrap-' + tableId);

        $xcTbodyWrap.scroll(function() {
            if (gMouseStatus === "movingTable") {
                return;
            }
            if ($rowScroller.hasClass('autoScroll')) {
                $rowScroller.removeClass('autoScroll');
                return;
            }

            $(".menu:visible").hide();
            removeMenuKeyboardNavigation();
            $('.highlightBox').remove();

            var table = gTables[tableId];
            focusTable(tableId);
            var $table = $('#xcTable-' + tableId);

            if ($table.height() < $('#mainFrame').height()) {
                // prevent scrolling on a short table
                $(this).scrollTop(0);
            }

            var innerDeferred = jQuery.Deferred();
            var firstRow = $table.find('tbody tr:first');
            var topRowNum = xcHelper.parseRowNum(firstRow);
            var info;
            var numRowsToAdd;

            if (firstRow.length === 0) {
                innerDeferred.resolve();
            } else if ($(this).scrollTop() === 0 &&
                !firstRow.hasClass('row0'))
            {
                scrollCount++;
                
                if (scrollCount < 2) {
                    // var initialTop = firstRow.offset().top;
                    numRowsToAdd = Math.min(gNumEntriesPerPage, topRowNum,
                                            table.resultSetMax);

                    var rowNumber = topRowNum - numRowsToAdd;
                    var lastRowToDisplay = $table.find('tbody tr:lt(30)');

                    info = {
                        "numRowsToAdd"    : numRowsToAdd,
                        "numRowsAdded"    : 0,
                        "targetRow"       : rowNumber,
                        "lastRowToDisplay": lastRowToDisplay,
                        "bulk"            : false,
                        "tableName"       : table.tableName,
                        "tableId"         : tableId
                    };

                    goToPage(rowNumber, numRowsToAdd, RowDirection.Top, false, info)
                    .then(function() {

                        scrollCount--;
                        innerDeferred.resolve();
                    })
                    .fail(function(error) {
                        scrollCount--;
                        innerDeferred.reject(error);
                    });
                } else {
                    scrollCount--;
                    innerDeferred.resolve();
                }
            } else if ($(this)[0].scrollHeight - $(this).scrollTop() -
                       // $(this).outerHeight() <= 1) {
                       $(this).outerHeight() <= 1) {
                scrollCount++;

                if (scrollCount < 2) {
                    numRowsToAdd = Math.min(gNumEntriesPerPage,
                                    table.resultSetMax -
                                    table.currentRowNumber);
                    info = {
                        "numRowsToAdd": numRowsToAdd,
                        "numRowsAdded": 0,
                        "targetRow"   : table.currentRowNumber +
                                        numRowsToAdd,
                        "lastRowToDisplay": table.currentRowNumber +
                                            numRowsToAdd,
                        "bulk"     : false,
                        "tableName": table.tableName,
                        "tableId"  : tableId
                    };
                    
                    goToPage(table.currentRowNumber, numRowsToAdd,
                             RowDirection.Bottom, false, info)
                    .then(function() {
                        scrollCount--;
                        innerDeferred.resolve();
                    })
                    .fail(function(error) {
                        scrollCount--;
                        innerDeferred.reject(error);
                    });
                } else {
                    scrollCount--;
                    innerDeferred.resolve();
                }
            } else {
                innerDeferred.resolve();
            }

            innerDeferred
            .then(function() {
                var rowScrollerMove = true;
                generateFirstVisibleRowNum(rowScrollerMove);
            })
            .fail(function(error) {
                console.error("Scroll Fails!", error);
            });
        });
    }

    /**
        This function sets up new tables to be added to the display and
        removes old tables.

        newTableNames is an array of tablenames to be added
        oldTableNames is an array of old tablenames to be replaced
        tablesToRemove is an array of tableNames to be removed later
        
        Possible Options:
        afterStartup: boolean to indicate if these tables are added after
                      page load
        lockTable: boolean, if true then this is an intermediate table that will
                   be locked throughout it's active life

    */
    
    function addTable(newTableNames, oldTableNames, tablesToRemove, options) {
        //XX don't just get first array value
        var tableId = xcHelper.getTableId(newTableNames[0]);
        var oldId;
        options = options || {};
        var afterStartup = options.afterStartup || false;
        var lockTable = options.lockTable || false;

        if (oldTableNames[0] == null) {
            WSManager.replaceTable(tableId);
        } else {
            oldId = xcHelper.getTableId(oldTableNames[0]);
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
            for (var i = 0; i < tablesToRemove.length; i++) {
                if (gTables[tablesToRemove[i]].active) {
                    TblManager.archiveTable(tablesToRemove[i], {
                        "del"              : ArchiveTable.Keep,
                        "delayTableRemoval": true
                    });
                }
            }
        }

        if (lockTable) {
            // replace just the ids instead of the entire table so we won't
            // see the flicker of intermediate tables

            if (oldId == null) {
                oldId = xcHelper.getTableId(oldTableNames[0]);
            }

            $("#xcTableWrap-" + oldId).removeClass("tableToRemove")
                                .find(".tableTitle .hashName")
                                .text('#' + tableId);
            $("#rowScroller-" + oldId).attr('id', 'rowScroller-' + tableId)
                                    .removeClass("rowScrollerToRemove");
            $('#dagWrap-' + oldId).attr('id', 'dagWrap-' + tableId)
                                .removeClass("dagWrapToRemove");
            changeTableId(oldId, tableId);

            var table = gTables[tableId];
            TableList.addTables([table], IsActive.Active);
            return (promiseWrapper(null));
        } else {
            return (TblManager.parallelConstruct(tableId, tablesToRemove,
                                                 {afterStartup: afterStartup}));
        }
    }

    function focusOnWorkspace() {
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

    function scrollAndFocusTable(tableName) {
        var tableId = xcHelper.getTableId(tableName);
        focusTable(tableId);
        var leftPos = $('#xcTableWrap-' + tableId).position().left +
                        $('#mainFrame').scrollLeft();
        $('#mainFrame').animate({scrollLeft: leftPos}, function() {
                            focusTable(tableId);
                        });
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

    // start the process of building table
    function startBuildTable(tableId, tablesToRemove) {
        var deferred   = jQuery.Deferred();
        var table      = gTables[tableId];
        var tableName  = table.tableName;
        var progCols   = table.tableCols;
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

            var $table = $('#xcTable-' + tableId);
            var requiredNumRows    = Math.min(gMaxEntriesPerPage,
                                              table.resultSetCount);
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
        .then(function() {
            // position sticky row column on visible tables
            moveFirstColumn();
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("startBuildTable fails!", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    function buildInitialTable(progCols, tableId, jsonObj, keyName) {
        var table = gTables[tableId];
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

        TblManager.pullRowsBulk(tableId, jsonObj, startIndex, dataIndex, null);
        addTableListeners(tableId);
        createTableHeader(tableId);
        addColListeners($table, tableId);

        if (numRows === 0) {
            $table.find('.idSpan').text("");
        }
    }

    function addTableListeners(tableId) {
        var $xcTableWrap = $('#xcTableWrap-' + tableId);
        var oldId = gActiveTableId;
        $xcTableWrap.mousedown(function() {
            if (gActiveTableId === tableId) {
                return;
            } else {
                gActiveTableId = tableId;
                var focusDag;
                if (oldId !== gActiveTableId) {
                    focusDag = true;
                }
                focusTable(tableId, focusDag);
            }
        }).scroll(function() {
            $(this).scrollLeft(0); // prevent scrolling when colmenu is open
            $(this).scrollTop(0); // prevent scrolling when colmenu is open
        });
    }

    function addRowListeners(newCells) {
        newCells.find('.jsonElement').dblclick(function() {
                JSONModal.show($(this));
            }
        );

        newCells.find('.rowGrab').mousedown(function(event) {
            if (event.which === 1) {
                gResrowMouseDown($(this), event);
            }
        });

        newCells.find('.idSpan').click(function() {
            var tableId = xcHelper.parseTableId($(this).closest('table'));
            var rowNum = parseInt($(this).closest('tr').attr('class').substring(3));
            if (gTables[tableId].bookmarks.indexOf(rowNum) < 0) {
                bookmarkRow(rowNum, tableId);
            } else {
                unbookmarkRow(rowNum, tableId);
            }
        });
    }

    function adjustRowHeights(newCells, rowIndex, tableId) {
        var rowObj = gTables[tableId].rowHeights;
        var numRows = newCells.length;
        var pageNum = Math.floor(rowIndex / gNumEntriesPerPage);
        var lastPageNum = pageNum + Math.ceil(numRows / gNumEntriesPerPage);
        var padding = 4;
        var $row;
        var $firstTd;

        for (var i = pageNum; i < lastPageNum; i++) {
            if (rowObj[i]) {
                for (var row in rowObj[i]) {
                    $row = newCells.filter(function() {
                        return ($(this).hasClass('row' + (row - 1)));
                    });
                    $firstTd = $row.find('td.col0');
                    $firstTd.outerHeight(rowObj[i][row]);
                    $row.find('td > div')
                        .css('max-height', rowObj[i][row] - padding);
                    $firstTd.children('div').css('max-height', rowObj[i][row]);
                    $row.addClass('changedHeight');
                }
            }
        }
    }

    function addColListeners($table, tableId) {
        var $thead = $table.find('thead tr');
        var $tbody = $table.find("tbody");
        var lastSelectedCell;

        // listeners on thead
        $thead.on("mousedown", ".flexContainer, .dragArea", function(event) {
            var $el = $(this);

            if ($("#mainFrame").hasClass("modalOpen")) {
                // not focus when in modal
                return;
            } else if ($el.closest('.dataCol').length !== 0) {
                return;
            }

            var $editableHead;
            if ($el.is('.dragArea')) {
                $editableHead = $el.closest('.header').find('.editableHead');
            } else {
                $editableHead = $el.find('.editableHead');
            }

            var colNum = xcHelper.parseColNum($editableHead);
            FnBar.focusOnCol($editableHead, tableId, colNum);

            var notDropDown = $(event.target).closest('.dropdownBox')
                                                .length === 0;
            if ($table.find('.selectedCell').length === 0) {
                $('.selectedCell').removeClass('selectedCell');
                lastSelectedCell = $editableHead;
            }

            if (event.ctrlKey || event.metaKey) {
                if ($el.closest('.selectedCell').length > 0) {
                    if (notDropDown) {
                        unhighlightColumn($editableHead);
                        FnBar.clear();
                        return;
                    }
                } else {
                    highlightColumn($editableHead, true);
                }
            } else if (event.shiftKey) {
                if (lastSelectedCell && lastSelectedCell.length > 0) {
                    var preColNum = xcHelper.parseColNum(lastSelectedCell);
                    var lowNum = Math.min(preColNum, colNum);
                    var highNum = Math.max(preColNum, colNum);
                    var $th;
                    var $col;
                    var select = !$el.closest('th').hasClass('selectedCell');

                    for (var i = lowNum; i <= highNum; i++) {
                        $th = $table.find('th.col' + i);
                        $col = $th.find('.editableHead');
                        if ($col.length === 0) {
                            continue;
                        }

                        if (select) {
                            highlightColumn($col, true);
                        } else if (notDropDown) {
                            unhighlightColumn($col);
                        }
                    }
                }
            } else {
                if ($el.closest('.selectedCell').length > 0) {
                    if (notDropDown) {
                        highlightColumn($editableHead, false);
                        lastSelectedCell = null;
                    } else {
                        highlightColumn($editableHead, true);
                    }
                } else {
                    highlightColumn($editableHead, false);
                    lastSelectedCell = null;
                }
            }

            xcHelper.removeSelectionRange();
            lastSelectedCell = $editableHead;
        });

        $thead[0].oncontextmenu = function(e) {
            var $target = $(e.target).closest('.header');
            if ($target.length) {
                $target = $target.find('.dropdownBox');
                var click = $.Event("click");
                click.rightClick = true;
                click.pageX = e.pageX;
                $target.trigger(click);
                e.preventDefault();
            }
        };

        $thead.on("click", ".dropdownBox", function(event) {
            var options = {"type": "thDropdown"};
            var $el = $(this);
            var $th = $el.closest("th");
            var isRightClick = event.rightClick;

            var colNum = xcHelper.parseColNum($th);

            $(".tooltip").hide();
            resetColMenuInputs($el);

            options.colNum = colNum;
            options.classes = $el.closest('.header').attr('class');

            if ($th.hasClass('indexedColumn')) {
                options.classes += " type-indexed";
            }

            if ($th.hasClass('dataCol')) {
                $('.selectedCell').removeClass('selectedCell');
                FnBar.clear();
            }

            if ($th.hasClass('newColumn') ||
                options.classes.indexOf('type') === -1) {
                options.classes += " type-newColumn";
            }
            if ($th.hasClass("userHidden")) {
                // column is hidden
                options.classes += " type-hidden";
            }

            if ($el.closest('.xcTable').hasClass('emptyTable')) {
                options.classes += " type-emptyTable";
            }

            if ($('th.selectedCell').length > 1) {
                options.classes += " type-multiColumn";
                options.multipleColNums = [];
                var tableCols = gTables[tableId].tableCols;
                var types = {};
                var tempType = "type-" + tableCols[colNum - 1].type;
                types[tempType] = true;

                var tempColNum;
                var hiddenDetected = false;
                $('th.selectedCell').each(function() {
                    tempColNum = xcHelper.parseColNum($(this));
                    options.multipleColNums.push(tempColNum);
                    if (!hiddenDetected && $(this).hasClass("userHidden")) {
                        hiddenDetected = true;
                        options.classes += " type-hidden";
                    }

                    tempType = "type-" + tableCols[tempColNum - 1].type;
                    if (!types.hasOwnProperty(tempType)) {
                        types[tempType] = true;
                        options.classes += " " + tempType;
                    }
                });
            }

            if (isRightClick) {
                options.mouseCoors = {"x": event.pageX, "y": $el.offset().top + 25};
            }

            dropdownClick($el, options);
        });

        $thead.on('mousedown', '.colGrab', function(event) {
            if (event.which !== 1) {
                return;
            }

            gRescolMouseDown($(this), event);
            dblClickResize($(this));
        });

        $thead.on('mousedown', '.dragArea', function(event) {
            if (event.which !== 1) {
                return;
            }
            if (event.ctrlKey || event.shiftKey || event.metaKey) {
                if ($(event.target).is('.iconHelper')) {
                    return;
                }
            }
            var headCol = $(this).parent().parent();

            dragdropMouseDown(headCol, event);
        });

        $thead.on("keydown", ".editableHead", function(event) {
            var $input = $(event.target);
            if (event.which === keyCode.Enter && !$input.prop("readonly")) {
                var colName = $input.val().trim();
                var colNum = xcHelper.parseColNum($input);

                if (colName === "" ||
                    ColManager.checkColDup($input, null, tableId, false, colNum))
                {
                    return false;
                }

                ColManager.renameCol(colNum, tableId, colName);

                $input.parent().removeClass("editable");
                // this will make the fnBar from not editable to editable
                FnBar.focusOnCol($input, tableId, colNum, true);
            }
        });

        // listeners on tbody
        $tbody.on("mousedown", "td", function(event) {
            var $td = $(this);
            var $el = $td.children('.clickable');

            if (event.which !== 1 || $el.length === 0) {
                return;
            }

            var yCoor = Math.max(event.pageY, $el.offset().top + $el.height() - 10);
            var colNum = xcHelper.parseColNum($td);
            var rowNum = xcHelper.parseRowNum($td.closest("tr"));
            var isUnSelect = false;

            $(".tooltip").hide();
            resetColMenuInputs($el);

            var $highlightBoxs = $(".highlightBox");

            // remove highlights of other tables
            $highlightBoxs.filter(function() {
                return (!$(this).hasClass(tableId));
            }).remove();

            if (isSystemMac && event.metaKey ||
                !isSystemMac && event.ctrlKey)
            {
                // ctrl key: multi selection
                multiSelection();
            } else if (event.shiftKey) {
                // shift key: multi selection from minIndex to maxIndex
                var $lastNoShiftCell = $highlightBoxs.filter(function() {
                    return $(this).hasClass("noShiftKey");
                });

                if ($lastNoShiftCell.length === 0) {
                    singleSelection();
                } else {
                    var lastColNum = $lastNoShiftCell.data("colNum");

                    if (lastColNum !== colNum) {
                        // when colNum changes
                        multiSelection();
                    } else {
                        // re-hightlight shift key cell
                        $highlightBoxs.filter(function() {
                            return $(this).hasClass("shiftKey");
                        }).remove();

                        var $curTable  = $td.closest(".xcTable");
                        var baseRowNum = $lastNoShiftCell.data("rowNum");

                        var minIndex = Math.min(baseRowNum, rowNum);
                        var maxIndex = Math.max(baseRowNum, rowNum);
                        var isShift = true;

                        for (var r = minIndex; r <= maxIndex; r++) {
                            var $cell = $curTable.find(".row" + r + " .col" + colNum);
                            // in case double added hightlight to same cell
                            $cell.find(".highlightBox").remove();

                            if (r === baseRowNum) {
                                highlightCell($cell, tableId, r, colNum);
                            } else {
                                highlightCell($cell, tableId, r, colNum, isShift);
                            }
                        }
                    }
                }
            } else {
                // select single cell
                singleSelection();
            }

            dropdownClick($el, {
                "type"      : "tdDropdown",
                "colNum"    : colNum,
                "rowNum"    : rowNum,
                "classes"   : "tdMenu", // specify classes to update colmenu's class attr
                "mouseCoors": {"x": event.pageX, "y": yCoor},
                "shiftKey"  : event.shiftKey,
                "isMutiCol" : isMultiColum(),
                "isUnSelect": isUnSelect
            });

            function singleSelection() {
                if ($highlightBoxs.length === 1 &&
                    $td.find('.highlightBox').length > 0)
                {
                    // deselect
                    unHighlightCell($td);
                    isUnSelect = true;
                } else {
                    $highlightBoxs.remove();
                    highlightCell($td, tableId, rowNum, colNum);
                }
            }

            function multiSelection() {
                // remove old shiftKey and noShiftKey class
                $highlightBoxs.removeClass("shiftKey")
                            .removeClass("noShiftKey");

                if ($td.find('.highlightBox').length > 0) {
                    // deselect
                    unHighlightCell($td);
                    isUnSelect = true;
                } else {
                    highlightCell($td, tableId, rowNum, colNum);
                }
            }
        });

        // right click the open colMenu
        $tbody[0].oncontextmenu = function(event) {
            var $el = $(event.target);
            var $td = $el.closest("td");
            var $div = $td.children('.clickable');
            if ($div.length === 0) {
                // when click sth like row marker cell, rowGrab
                return false;
            }

            var yCoor = Math.max(event.pageY, $el.offset().top + $el.height() - 10);
            var colNum = xcHelper.parseColNum($td);
            var rowNum = xcHelper.parseRowNum($td.closest("tr"));

            $(".tooltip").hide();
            resetColMenuInputs($el);

            if ($td.find(".highlightBox").length === 0) {
                // same as singleSelection()
                $(".highlightBox").remove();
                highlightCell($td, tableId, rowNum, colNum);
            }

            dropdownClick($div, {
                "type"      : "tdDropdown",
                "colNum"    : colNum,
                "rowNum"    : rowNum,
                "classes"   : "tdMenu", // specify classes to update colmenu's class attr
                "mouseCoors": {"x": event.pageX, "y": yCoor},
                "isMutiCol" : isMultiColum()
            });

            return false;
        };
    }

    // creates thead and cells but not the body of the table
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
                // console.error('Table not appended to the right spot, big problem!');
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
            var backName;

            if (columns[i].isDATACol() || columns[i].isNewCol) {
                backName = columns[i].name;
            } else {
                backName = columns[i].getBackColName();

                if (backName == null) {
                    // this is a handling of error case
                    backName = columns[i].name;
                }
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
                var thClass = "";
                if (columns[i].isHidden) {
                    width = 15;
                    thClass = " userHidden";
                } else {
                    width = columns[i].width;
                }
                newTable +=
                    '<th class="col' + newColid + ' th dataCol' + thClass + '" ' +
                        'style="width:' + width + 'px;">' +
                        '<div class="header type-data">' +
                            '<div class="dragArea"></div>' +
                            '<div class="colGrab"></div>' +
                            '<div class="flexContainer flexRow">' +
                            '<div class="flexWrap flex-left"></div>' +
                            '<div class="flexWrap flex-mid">' +
                                '<input value="DATA" readonly="" tabindex="-1"' +
                                    ' class="dataCol col' + newColid + '"' +
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
                newTable += TblManager.generateColumnHeadHTML(columnClass,
                                                    color, (i + 1), columns[i]);
            }  
        }

        newTable += '</tr></thead><tbody></tbody></table>';
        $('#xcTbodyWrap-' + tableId).append(newTable);
        return (dataIndex);
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

    return (TblManager);

}(jQuery, {}));
