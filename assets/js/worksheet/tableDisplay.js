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
            selectCol: number. column to be highlighted when table is ready
            isUndo: boolean, default is false. Set to true if this table is being
                  created from an undo operation,
            isRedo: boolean, default is false. Set to true if this table is being
                  brought from inactive or orphaned and is replacing an active table,
            position: int, used to place a table in a certain spot if not replacing
                        an older table. Currently has to be paired with undo or
                        redo

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
        var selectCol = options.selectCol;

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

        var promise;
        if (options.isUndo || options.isRedo) {
        // we're getting table through an undo or redo so columns are already set
            promise = setResultSet(newTableName);
        } else {
            promise = TblManager.setgTable(newTableName, tableCols, setOptions);
        }

        promise
        .then(function() {
            if (focusWorkspace) {
                focusOnWorkspace();
            }
            var addTableOptions;
            var oldTNames = [];

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
                    oldTNames = [targetTable];
                } else {
                    // find the first table in the worksheet,
                    // that is the target worksheet
                    var wsTables = WSManager.getWSById(worksheet).tables;
                    for (var i = 0, len = wsTables.length; i < len; i++) {
                        var index = oldTableIds.indexOf(wsTables[i]);
                        if (index >= 0) {
                            targetTable = oldTableNames[index];
                            oldTNames = [targetTable];
                            break;
                        }
                    }

                    if (targetTable == null) {
                        // If we're here, we could not find a table in the
                        // active worksheet to be replaced so the new table
                        // will eventually just be appended to the active worksheet
                        // The old tables will still be removed;
                        console.warn("Current WS has no tables to replace");
                        // oldTNames will remain an empty array
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
                    "lockTable"   : lockTable,
                    "selectCol"   : selectCol,
                    "isUndo"      : options.isUndo,
                    "isRedo"      : options.isRedo,
                    "position"    : options.position,
                    "from"        : options.from
                };

                addTable([newTableName], oldTNames, tablesToRemove,
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
                    "afterStartup": afterStartup,
                    "isUndo"      : options.isUndo,
                    "isRedo"      : options.isRedo,
                    "position"    : options.position,
                    "from"        : options.from
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
        selectCol: number. column to be highlighted when table is ready
    */
    TblManager.parallelConstruct = function (tableId, tablesToRemove, options) {
        options = options || {};
        var deferred  = jQuery.Deferred();
        var deferred1 = startBuildTable(tableId, tablesToRemove, options);
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
                                        .find('[data-id="' +
                                               table.tableId + '"]');
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
        Sets gTable meta data, specially for orphan table
        Possible Options:
        tableProperties: an object containing bookmarks and rowheights;
    */
    TblManager.setOrphanTableMeta = function(tableName, tableCols, options) {
        options = options || {};

        var tableId = xcHelper.getTableId(tableName);
        var table = new TableMeta({
            "tableId"   : tableId,
            "tableName" : tableName,
            "tableCols" : tableCols,
            "isOrphaned": true
        });

        var tableProperties = options.tableProperties;
        if (tableProperties) {
            table.bookmarks = tableProperties.bookmarks || [];
            table.rowHeights = tableProperties.rowHeights || {};
        }

        gTables[tableId] = table;

        return table;
    };

    TblManager.inActiveTables = function(tableIds) {
        // a wrapper function to archive bunch of tables
        xcHelper.assert((tableIds != null), "Invalid arguments");

        if (!(tableIds instanceof Array)) {
            tableIds = [tableIds];
        }

        var options = {"del": ArchiveTable.Keep};
        var tableNames = [];
        var tablePos = [];

        for (var i = 0, len = tableIds.length; i < len; i++) {
            var tableId = tableIds[i];
            tableNames.push(gTables[tableId].tableName);
            tablePos.push(WSManager.getTableRelativePosition(tableId));
            TblManager.archiveTable(tableId, options);
        }

        // add sql
        SQL.add('Archive Table', {
            "operation"  : SQLOps.ArchiveTable,
            "tableIds"   : tableIds,
            "tableNames" : tableNames,
            "tablePos"   : tablePos,
            "htmlExclude": ["tablePos"]
        });
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
            if (gActiveTableId === tableId) {
                $('#rowInput').val("").data("val", "");
                $('#numPages').empty();
            }
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
            TableList.removeTable(tableId, 'active');
        }

        if (gActiveTableId === tableId) {
            gActiveTableId = null;
        }
        if ($('.xcTableWrap:not(.inActive)').length === 0) {
            RowScroller.empty();
        }

        moveTableDropdownBoxes();
        moveTableTitles();
        moveFirstColumn();

        // disallow dragging if only 1 table in worksheet
        checkTableDraggable();
    };

    // currently used only for undo redo
    //options:
    // remove: boolean, if true will remove table from html
    TblManager.sendTableToOrphaned = function(tableId, options) {
        if (options && options.remove) {
            $("#xcTableWrap-" + tableId).remove();
            $("#rowScroller-" + tableId).remove();
            $("#dagWrap-" + tableId).remove();
        } else {
            $("#xcTableWrap-" + tableId).addClass('tableToRemove');
            $("#rowScroller-" + tableId).addClass('rowScrollerToRemove');
            $("#dagWrap-" + tableId).addClass('dagWrapToRemove');
        }

        TableList.removeTable(tableId);

        var table = gTables[tableId];
        table.freeResultset();
        table.beInActive()
             .beOrphaned()
             .updateTimeStamp();

        WSManager.removeTable(tableId);
        Dag.makeInactive(tableId);

        if (gActiveTableId === tableId) {
            gActiveTableId = null;
            $('#rowInput').val("").data("val", "");
            $('#numPages').empty();
        }

        if ($('.xcTableWrap:not(.inActive').length === 0) {
            RowScroller.empty();
        }

        moveTableDropdownBoxes();
        moveTableTitles();
        moveFirstColumn();

        // disallow dragging if only 1 table in worksheet
        checkTableDraggable();
    };

    TblManager.deleteTables = function(tables, tableType) {
        // XXX not tested yet!!!
        var deferred = jQuery.Deferred();

        if (!(tables instanceof Array)) {
            tables = [tables];
        }

        var sql = {
            "operation": SQLOps.DeleteTable,
            "tables"   : tables,
            "tableType": tableType
        };
        var txId = Transaction.start({
            "operation": SQLOps.DeleteTable,
            "sql"      : sql
        });

        var defArray = [];

        if (tableType === TableType.Orphan) {
            // delete orphaned
            tables.forEach(function(tableName) {
                var def = delOrphanedHelper(tableName, tableType, txId);
                defArray.push(def);
            });
        } else {
            tables.forEach(function(tableId) {
                var def = delTableHelper(tableId, tableType, txId);
                defArray.push(def);
            });
        }

        xcHelper.when.apply(window, defArray)
        .then(function() {
            Transaction.done(txId);
            deferred.resolve();
        })
        .fail(function(error){
            Transaction.fail(txId, {
                "error"  : error,
                "failMsg": StatusMessageTStr.DeleteTableFailed
            });
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    TblManager.restoreTableMeta = function(oldgTables) {
        for (var tableId in oldgTables) {
            var oldMeta = oldgTables[tableId];
            var table = new TableMeta(oldMeta);

            if (table.isLocked) {
                table.isLocked = false;
                table.active = false;
            }

            gTables[tableId] = table;
        }
    };

    TblManager.pullRowsBulk = function(tableId, jsonObj, startIndex, dataIndex,
                                       direction, rowToPrependTo) {
        // this function does some preparation for ColManager.pullAllCols()
        startIndex = startIndex || 0;
        var $table = $('#xcTable-' + tableId);
        var $tableWrap = $table.closest('.xcTableWrap');
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
        $tableWrap.find('.rowGrab').width($table.width());
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

        var disabledProp;
        var disabledClass;
        if (columnName === "") {
            disabledProp = "";
            disabledClass = " editable";
        } else {
            disabledProp = "disabled";
            disabledClass = "";
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
                        '<div class="flexWrap flex-mid' + disabledClass +
                            '"' + tooltip + '>' +
                            '<input class="editableHead col' + newColid + '"' +
                                ' type="text"  value="' + columnName + '"' +
                                ' size="15" spellcheck="false" ' +
                                disabledProp + '/>' +
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
        var $tableWrap = $('#xcTableWrap-' + tableId);
        $tableWrap.removeClass('tableHidden');
        WSManager.focusOnWorksheet(WSManager.getActiveWS(), false, tableId);
        moveTableDropdownBoxes();
        moveFirstColumn();
        moveTableTitles();

        var $table = $('#xcTable-' + tableId);
        $tableWrap.find('.rowGrab').width($table.width());

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
        var oldOrder = []; // to save the old column order
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
            oldOrder.push(oldColIndex - 1);
        }

        if (dataCol) { // if data col was removed from sort, put it back
            tableCols.push(dataCol);
            oldOrder.push(numCols);
        }

        TableList.updateTableInfo(tableId);

        SQL.add("Sort Table Columns", {
            "operation"    : SQLOps.SortTableCols,
            "tableName"    : table.tableName,
            "tableId"      : tableId,
            "direction"    : direction,
            "originalOrder": oldOrder,
            "htmlExclude"  : ['originalOrder']
        });
    };

    // provide an order ex. [2,0,3,1];
    TblManager.orderAllColumns = function(tableId, order) {
        var progCols = gTables[tableId].tableCols;
        var numCols = order.length;
        var index;
        var newCols = [];
        var indices = [];

        var $table = $('#xcTable-' + tableId);
        var $ths = $table.find('th');
        var thHtml = $ths.eq(0)[0].outerHTML;
        var tdHtml = "";
        // var numRows = $table.find('tbody tr').length;
        var $th;

        // column headers
        for (var i = 0; i < numCols; i++) {
            index = order.indexOf(i);
            indices.push(index);
            newCols.push(progCols[index]);
            $th = $ths.eq(index + 1);
            $th.removeClass('col' + (index + 1));
            $th.addClass('col' + (i + 1));
            $th.find('.col' + (index + 1)).removeClass('col' + (index + 1))
                .addClass('col' + (i + 1));
            thHtml += $th[0].outerHTML;

        }

        // column rows and tds
        var $tds;
        var $td;
        $table.find('tbody tr').each(function(rowNum) {
            tdHtml += '<tr class="row' + rowNum + '">';
            $tds = $(this).find('td');
            tdHtml += $tds.eq(0)[0].outerHTML;
            for (var i = 0; i < numCols; i++) {
                index = indices[i];
                $td = $tds.eq(index + 1);
                $td.removeClass('col' + (index + 1));
                $td.addClass('col' + (i + 1));
                $td.find('.col' + (index + 1)).removeClass('col' + (index + 1))
                   .addClass('col' + (i + 1));
                tdHtml += $td[0].outerHTML;
            }
            tdHtml += '</tr>';
        });

        // update everything
        gTables[tableId].tableCols = newCols;
        $table.find('thead tr').html(thHtml);
        $table.find('tbody').html(tdHtml);

        TableList.updateTableInfo(tableId);
        addRowListeners($table.find('tbody'));
    };

    TblManager.resizeColumns = function(tableId, resizeTo, columnNums) {
        var sizeToHeader = false;
        var fitAll = false;

        switch (resizeTo) {
            case 'sizeToHeader':
                sizeToHeader = true;
                break;
            case 'sizeToFitAll':
                sizeToHeader = true;
                fitAll = true;
                break;
            case 'sizeToContents':
                // leave false
                break;
            default:
                throw "Error Case!";
        }

        var table   = gTables[tableId];
        var columns = [];
        var colNums = [];
        if (columnNums !== undefined) {

            if (typeof columnNums !== "object") {
                colNums.push(columnNums);
            } else {
                colNums = columnNums;
            }
            for (var i = 0; i < colNums.length; i++) {
                columns.push(table.tableCols[colNums[i] - 1]);
            }
        } else {
            columns = table.tableCols;
            for (var i = 0; i < columns.length; i++) {
                colNums.push(i + 1);
            }
        }

        var $th;
        var $table = $('#xcTable-' + tableId);
        var oldColumnWidths = [];
        var newWidths = [];

        for (var i = 0, numCols = columns.length; i < numCols; i++) {
            $th = $table.find('th.col' + (colNums[i]));
            columns[i].sizeToHeader = !sizeToHeader;
            columns[i].isHidden = false;
            oldColumnWidths.push(columns[i].width);

            newWidths.push(autosizeCol($th, {
                "dblClick"      : true,
                "minWidth"      : 17,
                "unlimitedWidth": false,
                "includeHeader" : sizeToHeader,
                "fitAll"        : fitAll,
                "multipleCols"  : true
            }));
        }


        matchHeaderSizes($table);

        SQL.add("Resize Columns", {
            "operation"      : SQLOps.ResizeTableCols,
            "tableName"      : table.tableName,
            "tableId"        : tableId,
            "resizeTo"       : resizeTo,
            "columnNums"     : colNums,
            "oldColumnWidths": oldColumnWidths,
            "newColumnWidths": newWidths,
            "htmlExclude"    : ["columnNums", "oldColumnWidths", "newColumnWidths"]
        });
    };

    // only used for undo / redos
    TblManager.resizeColsToWidth = function(tableId, colNums, widths) {
        var $table = $('#xcTable-' + tableId);
        $table.find('.userHidden').removeClass('userHidden');
        var progCols = gTables[tableId].tableCols;
        var numCols = colNums.length;
        var colNum;
        for (var i = 0; i < numCols; i++) {
            colNum = colNums[i];
            if (!widths) {
                console.log('not found');
            }
            $table.find('th.col' + colNum).outerWidth(widths[i]);
            progCols[colNum - 1].width = widths[i];
        }
        matchHeaderSizes($table);
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
                RowScroller.genFirstVisibleRowNum(rowScrollerMove);
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
        selectCol: number, column to be selected once new table is ready
        isUndo: boolean, default is false. If true, we are adding this table
                through an undo
        isRedo: boolean, default is false. If true, we are adding this table
                from inactive or orphaned list and replacing an active table

    */

    function addTable(newTableNames, oldTableNames, tablesToRemove, options) {
        //XX don't just get first array value
        var tableId = xcHelper.getTableId(newTableNames[0]);
        var oldId;
        options = options || {};
        var afterStartup = options.afterStartup || false;
        var lockTable = options.lockTable || false;
        var selectCol = options.selectCol;

        if (options.isUndo && options.position != null) {
            WSManager.replaceTable(tableId, null, null,
                                  {position: options.position});
        } else if (oldTableNames[0] == null) {
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

        if (options.isUndo) {
            TableList.removeTable(tableId, "inactive");
        }

        // WSManager.replaceTable need to know oldTable's location
        // so remove table after that
        if (tablesToRemove) {
            for (var i = 0; i < tablesToRemove.length; i++) {
                if (gTables[tablesToRemove[i]].active) {
                    if (options.isUndo && options.from !== "inactive") {
                        TblManager.sendTableToOrphaned(tablesToRemove[i]);
                    } else {
                        TblManager.archiveTable(tablesToRemove[i], {
                            "del"              : ArchiveTable.Keep,
                            "delayTableRemoval": true
                        });
                    }

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
            var parallelOptions = {
                afterStartup: afterStartup,
                selectCol   : selectCol
            };
            return (TblManager.parallelConstruct(tableId, tablesToRemove,
                                                 parallelOptions));
        }
    }

        // used for recreating undone tables in refreshTables
    function setResultSet(tableName) {
        var deferred = jQuery.Deferred();
        var tableId = xcHelper.getTableId(tableName);
        var table = gTables[tableId];

        getResultSet(tableName)
        .then(function(resultSet) {
            table.updateFromResultset(resultSet);
            table.beActive();
            table.isOrphaned = false;
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("setTableMeta Fails!", error);
            deferred.reject(error);
        });

        return (deferred.promise());
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
        $('#mainFrame').animate({scrollLeft: leftPos}, 600, function() {
            RowScroller.genFirstVisibleRowNum();
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

    /*
        Start the process of building table
        Possible Options:
        selectCol: number. column to be highlighted when table is ready
    */
    function startBuildTable(tableId, tablesToRemove, options) {
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
            buildInitialTable(progCols, tableId, jsonObj, keyName, options);

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
                            if (options.selectCol != null &&
                                $('.xcTable th.selectedCell').length === 0)
                            {
                                $table.find('th.col' + options.selectCol +
                                            ' .flexContainer').mousedown();
                            }
                        });
            }
        })
        .then(function() {
            autoSizeDataCol(tableId, progCols);
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

    /*
        Possible Options:
        selectCol: number. column to be highlighted when table is ready
    */
    function buildInitialTable(progCols, tableId, jsonObj, keyName, options) {
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
        TblManager.addColListeners($table, tableId);

        var activeWS = WSManager.getActiveWS();
        var tableWS = WSManager.getWSFromTable(tableId);
        if ((activeWS === tableWS) &&
            $('.xcTableWrap.worksheet-' + activeWS).length &&
            $('.xcTableWrap.worksheet-' + activeWS).find('.tblTitleSelected')
                                                   .length === 0) {
            // if active worksheet and no other table is selected;
            focusTable(tableId, true);
        }

        // highlights new cell if no other cell is selected
        if (options.selectCol != null) {
            if ($('.xcTable th.selectedCell').length === 0) {
                $table.find('th.col' + (options.selectCol + 1) +
                            ' .flexContainer').mousedown();
            }
        }

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
                TblAnim.startRowResize($(this), event);
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

    TblManager.addColListeners = function($table, tableId) {
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

        $thead.find('.rowNumHead').mousedown(function() {
            $thead.find('.editableHead').each(function() {
                highlightColumn($(this), true);
            });
        });

        $thead.on("click", ".dropdownBox", function(event) {
            if ($("#mainFrame").hasClass("modalOpen")) {
                // not focus when in modal
                return;
            }
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
                if ($el.closest('.flexWrap').siblings('.editable').length) {
                    options.classes += " type-untitled";
                }
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
                options.mouseCoors = {"x": event.pageX, "y": $el.offset().top + 34};
            }

            dropdownClick($el, options);
        });

        $thead.on('mousedown', '.colGrab', function(event) {
            if (event.which !== 1) {
                return;
            }

            TblAnim.startColResize($(this), event);
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

            TblAnim.startColDrag(headCol, event);
        });

        $thead.on("keydown", ".editableHead", function(event) {
            var $input = $(event.target);
            if (event.which === keyCode.Enter && !$input.prop("disabled")) {
                var colName = $input.val().trim();
                var colNum = xcHelper.parseColNum($input);

                if (colName === "" ||
                    ColManager.checkColDup($input, null, tableId, false, colNum))
                {
                    return false;
                }

                ColManager.renameCol(colNum, tableId, colName);
            }
        });

        $thead.on("blur", ".editableHead", function(event) {
            var $input = $(event.target);

            if (!$input.prop("disabled") &&
                $input.closest('.selectedCell').length === 0)
            {
                $input.val("");
                var $activeTarget = gMouseEvents.getLastMouseDownTarget();

                if (!$activeTarget.closest('.header')
                                  .find('.flex-mid')
                                  .hasClass('editable')) {
                    $('#fnBar').removeClass("disabled");
                }
            }
        });

        // listeners on tbody
        $tbody.on("mousedown", "td", function(event) {
            var $td = $(this);
            var $el = $td.children('.clickable');

            if ($("#mainFrame").hasClass("modalOpen")) {
                // not focus when in modal
                return;
            }

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
                "isMutiCol" : isMultiColumn(),
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
            if ($("#mainFrame").hasClass("modalOpen")) {
                $el.trigger('click');
                // not focus when in modal
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
                "isMutiCol" : isMultiColumn()
            });

            return false;
        };
    };

    // creates thead and cells but not the body of the table
    function generateTableShell(columns, tableId) {
        // var table = gTables[tableId];
        var activeWS = WSManager.getActiveWS();
        var tableWS = WSManager.getWSFromTable(tableId);
        var tableClasses = "";
        if (activeWS !== tableWS) {
            tableClasses = 'inActive';
        }
        var wrapper =
            '<div id="xcTableWrap-' + tableId + '"' +
                ' class="xcTableWrap tableWrap ' + tableClasses + '" ' +
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

        var tHeadTbodyInfo = TblManager.generateTheadTbody(columns, tableId);
        var newTable =
            '<table id="xcTable-' + tableId + '" class="xcTable dataTable" ' +
            'style="width:0px;" data-id="' + tableId + '">' +
                tHeadTbodyInfo.html +
            '</table>' +
            '<div class="rowGrab last"></div>';

        $('#xcTbodyWrap-' + tableId).append(newTable);
        $('#xcTbodyWrap-' + tableId).find('.rowGrab.last').mousedown(function(event) {
            if (event.which === 1) {
                TblAnim.startRowResize($(this), event);
            }
        });

        return (tHeadTbodyInfo.dataIndex);
    }

    // returns {html: html, dataIndex: dataIndex};
    TblManager.generateTheadTbody = function(columns, tableId) {
        var table = gTables[tableId];
        var newTable =
            '<thead>' +
              '<tr>' +
                '<th style="width: 50px;" class="col0 th rowNumHead"' +
                    ' title="select all columns" data-toggle="tooltip"' +
                    ' data-placement="top" data-container="body">' +
                  '<div class="header">' +
                    '<input value="" spellcheck="false" disabled>' +
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
            } else if (columns[i].name === "" || columns[i].func.name === "") {
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
                if (width === 'auto') {
                    width = 400;
                }
                newTable += generateDataHeadHTML(newColid, thClass, width);
            } else {
                newTable += TblManager.generateColumnHeadHTML(columnClass,
                                                    color, (i + 1), columns[i]);
            }
        }

        newTable += '</tr></thead><tbody></tbody>';

        return ({html: newTable, dataIndex: dataIndex});
    };

    function generateDataHeadHTML(newColid, thClass, width) {
        var newTable =
            '<th class="col' + newColid + ' th dataCol' + thClass + '" ' +
                'style="width:' + width + 'px;">' +
                '<div class="header type-data">' +
                    '<div class="dragArea"></div>' +
                    '<div class="colGrab"></div>' +
                    '<div class="flexContainer flexRow">' +
                    '<div class="flexWrap flex-left"></div>' +
                    '<div class="flexWrap flex-mid">' +
                        '<input value="DATA" spellcheck="false" ' +
                            ' class="dataCol col' + newColid + '"' +
                            ' data-toggle="tooltip" data-placement="bottom" ' +
                            '" title="raw data" disabled>' +
                    '</div>' +
                    '<div class="flexWrap flex-right">' +
                        '<div class="dropdownBox">' +
                            '<div class="innerBox"></div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</th>';

        return (newTable);
    }

    function delTableHelper(tableId, tableType, txId) {
        var deferred = jQuery.Deferred();

        var table = gTables[tableId];
        var tableName = table.tableName;

        // Free the result set pointer that is still pointing to it
        XcalarSetFree(table.resultSetId)
        .then(function() {
            return XcalarDeleteTable(tableName, txId);
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
                        RowScroller.genFirstVisibleRowNum();
                    }
                }, 300);
            } else if (tableType === TableType.Agg) {
                // XXX as delete table is temporarily disabled
                // this case is not tested yet!
                TableList.removeAggTable(tableId);
            }

            deferred.resolve();
        })
        .fail(deferred.reject(error));

        return (deferred.promise());
    }

    function delOrphanedHelper(tableName, txId) {
        var deferred = jQuery.Deferred();

        XcalarDeleteTable(tableName, txId)
        .then(function() {
            var tableIndex = gOrphanTables.indexOf(tableName);
            gOrphanTables.splice(tableIndex, 1);
            Dag.makeInactive(tableName, true);

            var tableId = xcHelper.getTableId(tableName);
            if (tableId != null && gTables[tableId] != null) {
                delete gTables[tableId];
            }

            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function autoSizeDataCol(tableId, progCols) {
        var numCols = progCols.length;
        var dataCol;
        var dataColIndex;
        for (var i = 0; i < numCols; i++) {
            if (progCols[i].name === "DATA") {
                dataCol = progCols[i];
                dataColIndex = i + 1;
                break;
            }
        }
        if (dataCol.width === "auto") {
            var winWidth = $(window).width();
            var maxWidth = 400;
            if (winWidth > 1400) {
                maxWidth = 600;
            } else if (winWidth > 1100) {
                maxWidth = 500;
            }
            var $th = $('#xcTable-' + tableId).find('th.col' + dataColIndex);
            autosizeCol($th, {
                "fitAll"  : true,
                "minWidth": 200,
                "maxWidth": maxWidth
            });
        }
    }

    function isMultiColumn() {
        var lastColNum;
        var multiCol = false;

        $(".highlightBox").each(function() {
            var colNum = $(this).data("colNum");

            if (lastColNum == null) {
                lastColNum = colNum;
            } else if (lastColNum !== colNum) {
                multiCol = true;
                return false;
            }
        });

        return (multiCol);
    }

    return (TblManager);

}(jQuery, {}));
