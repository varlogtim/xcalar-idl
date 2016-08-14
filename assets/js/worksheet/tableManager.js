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
        var newTableName = newTableNames[0];
        var newTableId = xcHelper.getTableId(newTableName);

        if (typeof(oldTableNames) === "string") {
            oldTableNames = [oldTableNames];
        }

        // must get worksheet to add before async call,
        // otherwise newTable may add to wrong worksheet
        if (worksheet != null) {
            WSManager.addTable(newTableId, worksheet);
        }
        // the only case that worksheet is null is add from inActive list

        var promise;
        if (!tableCols) {
            if (!gTables[newTableId] || // Short circuit
                gTables[newTableId].status === TableType.Orphan) {
                TableList.removeTable(newTableName);
            } else {
                TableList.removeTable(newTableId);
            }
            // if no tableCols provided, columns are already set
            if (gTables[newTableId]) {
                promise = setResultSet(newTableName);
            } else {
                promise = TblManager.setgTable(newTableName,
                                               ColManager.newDATACol(),
                                               {"isActive": true});
            }
        } else {
            var setOptions = {
                "isActive"       : true,
                "tableProperties": options.tableProperties
            };
            promise = TblManager.setgTable(newTableName, tableCols, setOptions);
        }

        promise
        .then(function() {
            if (options.focusWorkspace) {
                focusOnWorkspace();
            }
            var addTableOptions;
            var tablesToReplace = [];
            var tablesToRemove = [];

            if (oldTableNames.length > 0) {
                // figure out which old table we will replace
                setTablesToReplace(oldTableNames, worksheet, tablesToReplace,
                                   tablesToRemove);
            }

            // append newly created table to the back, do not remove any tables
            addTableOptions = {
                "afterStartup": true,
                "lockTable"   : options.lockTable,
                "selectCol"   : options.selectCol,
                "isUndo"      : options.isUndo,
                "position"    : options.position,
                "from"        : options.from
            };

            addTable([newTableName], tablesToReplace, tablesToRemove,
                     addTableOptions)
            .then(function() {
                if (options.focusWorkspace) {
                    scrollAndFocusTable(newTableName);
                } else {
                    var wsNum = WSManager.getActiveWS();
                    if ($('.xcTableWrap.worksheet-' + wsNum).
                                       find('.tblTitleSelected').length === 0) {
                        var tableId = xcHelper.getTableId(newTableName);
                        focusTable(tableId);
                    }
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

    function setTablesToReplace(oldTableNames, worksheet, tablesToReplace,
                                tablesToRemove) {
        var oldTableIds = [];

        for (var i = 0, len = oldTableNames.length; i < len; i++) {
            oldTableIds.push(xcHelper.getTableId(oldTableNames[i]));
        }

        if (oldTableNames.length === 1) {
            // only have one table to remove
            tablesToReplace.push(oldTableNames[0]);
        } else {
            // find the first table in the worksheet,
            // that is the target worksheet
            // var targetTable;
            var wsTables = WSManager.getWSById(worksheet).tables;
            var index;
            for (var i = 0, len = wsTables.length; i < len; i++) {
                index = oldTableIds.indexOf(wsTables[i]);
                if (index > -1) {
                    tablesToReplace.push(oldTableNames[index]);
                    break;
                }
            }

            if (tablesToReplace.length === 0) {
                // If we're here, we could not find a table to be replaced in the
                // active worksheet, so the new table
                // will eventually just be appended to the active worksheet
                // The old tables will still be removed;
                console.warn("Current WS has no tables to replace");
                // tablesToReplace will remain an empty array
            }
        }

        var oldTableId;
        for (var i = 0, len = oldTableIds.length; i < len; i++) {
            oldTableId = oldTableIds[i];
            if (tablesToRemove.indexOf(oldTableId) < 0) {
                // if oldTableId alredy exists (like self join)
                // not add again
                tablesToRemove.push(oldTableId);
            }
        }
    }

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
        var deferred2 = Dag.construct(tableId, tablesToRemove);
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

        var table = new TableMeta({
            "tableId"  : tableId,
            "tableName": tableName,
            "tableCols": tableCols
        });

        if (tableProperties) {
            table.bookmarks = tableProperties.bookmarks || [];
            table.rowHeights = tableProperties.rowHeights || {};
        }

        if (options.isActive) {
            // the table is in active worksheet, should have meta from backend
            // table.currentRowNumber = 0;

            table.updateResultset()
            .then(function() {
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

        return deferred.promise();
    };

    /*
        Sets gTable meta data, specially for orphan table
        Possible Options:
        tableProperties: an object containing bookmarks and rowheights;
    */
    TblManager.setOrphanTableMeta = function(tableName, tableCols, options) {
        options = options || {};
        if (tableCols == null) {
            // at last have data col
            tableCols = ColManager.newDATACol();
        }

        var tableId = xcHelper.getTableId(tableName);
        var table = new TableMeta({
            "tableId"  : tableId,
            "tableName": tableName,
            "tableCols": tableCols,
            "status"   : TableType.Orphan
        });

        var tableProperties = options.tableProperties;
        if (tableProperties) {
            table.bookmarks = tableProperties.bookmarks || [];
            table.rowHeights = tableProperties.rowHeights || {};
        }

        gTables[tableId] = table;

        return table;
    };

    TblManager.archiveTables = function(tableIds) {
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
        // var tempHide = options.tempHide || false;
        if (delayTableRemoval) {
            $("#xcTableWrap-" + tableId).addClass('tableToRemove');
            $("#rowScroller-" + tableId).addClass('rowScrollerToRemove');
            $("#dagWrap-" + tableId).addClass('dagWrapToRemove');
        } else {
            $("#xcTableWrap-" + tableId).remove();
            $("#rowScroller-" + tableId).remove();
            Dag.destruct(tableId);
            if (gActiveTableId === tableId) {
                $('#rowInput').val("").data("val", "");
                $('#numPages').empty();
            }
        }

        if (!del) {
            var table = gTables[tableId];
            // free result set when archieve
            table.freeResultset();
            table.beArchived();
            table.updateTimeStamp();
            // WSManager.archiveTable(tableId, tempHide);
            WSManager.changeTableStatus(tableId, TableType.Archived);
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

    // TblManager.sendTablesToTrash = function(tableIds, tableType) {
    //     var deferred = jQuery.Deferred();

    //     if (!(tableIds instanceof Array)) {
    //         tableIds = [tableIds];
    //     }
    //     var sql = {
    //         "operation": SQLOps.DeleteTable,
    //         "tables"   : tableIds,
    //         "tableType": tableType
    //     };
    //     var txId = Transaction.start({
    //         "operation": SQLOps.DeleteTable,
    //         "sql"      : sql
    //     });

    //     var defArray = [];

    //     tableIds.forEach(function(tableId) {
    //         var options = {
    //             remove: true,
    //             trash: true
    //         };
    //         var def = TblManager.sendTableToOrphaned(tableId, options);
    //         defArray.push(def);
    //     });

    //     PromiseHelper.when.apply(window, defArray)
    //     .then(function() {
    //         Transaction.done(txId);
    //         deferred.resolve();
    //     })
    //     .fail(function(error){
    //         Transaction.fail(txId, {
    //             "error"  : error,
    //             "failMsg": StatusMessageTStr.DeleteTableFailed
    //         });
    //         deferred.reject(error);
    //     });

    //     return (deferred.promise());
    // };

    //options:
    // remove: boolean, if true will remove table from html
    // keepInWS: boolean, if true will not remove table from WSManager
    // noFocusWS: boolean, if true will not focus on tableId's Worksheet
    TblManager.sendTableToOrphaned = function(tableId, options) {
        var deferred = jQuery.Deferred();
        options = options || {};
        if (options.remove) {
            $("#xcTableWrap-" + tableId).remove();
            $("#rowScroller-" + tableId).remove();
            Dag.destruct(tableId);
        } else {
            $("#xcTableWrap-" + tableId).addClass('tableToRemove');
            $("#rowScroller-" + tableId).addClass('rowScrollerToRemove');
            $("#dagWrap-" + tableId).addClass('dagWrapToRemove');
        }

        var table = gTables[tableId];
        table.freeResultset()
        .then(function() {
            var wsId;
            if (!options.noFocusWS) {
                wsId = WSManager.getWSFromTable(tableId);
            }

            TableList.removeTable(tableId);
            if (!options.keepInWS) {
                WSManager.removeTable(tableId);
                // Dag.makeInactive(tableId);
            } else {
                WSManager.changeTableStatus(tableId, TableType.Orphan);
            }

            table.beOrphaned();
            table.updateTimeStamp();

            if (gActiveTableId === tableId) {
                gActiveTableId = null;
                $('#rowInput').val("").data("val", "");
                $('#numPages').empty();
            }

            if ($('.xcTableWrap:not(.inActive').length === 0) {
                RowScroller.empty();
            }

            if (!options.noFocusWS) {
                var activeWS = WSManager.getActiveWS();
                if (activeWS !== wsId) {
                    WSManager.focusOnWorksheet(wsId);
                }
            }

            moveTableDropdownBoxes();
            moveTableTitles();
            moveFirstColumn();

            // disallow dragging if only 1 table in worksheet
            checkTableDraggable();
            deferred.resolve();
        })
        .fail(function(error) {
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    // // Currently called when removing old tables during an add table
    // //options:
    // // delayTableRemoval: boolean. If true, special class will be added to
    // //        table until it is removed later
    // function makeTableOrphaned(tableId, options) {
    //     var deferred = jQuery.Deferred();
    //     options = options || {};
    //     if (options.delayTableRemoval) {
    //         $("#xcTableWrap-" + tableId).addClass('tableToRemove');
    //         $("#rowScroller-" + tableId).addClass('rowScrollerToRemove');
    //         $("#dagWrap-" + tableId).addClass('dagWrapToRemove');
    //     } else {
    //         $("#xcTableWrap-" + tableId).remove();
    //         $("#rowScroller-" + tableId).remove();
    //         $("#dagWrap-" + tableId).remove();
    //     }

    //     var table = gTables[tableId];
    //     table.freeResultset()
    //     .then(function() {
    //         TableList.removeTable(tableId);
    //         table.beOrphaned()
    //              .updateTimeStamp();

    //         Dag.makeInactive(tableId);

    //         if (gActiveTableId === tableId) {
    //             gActiveTableId = null;
    //             $('#rowInput').val("").data("val", "");
    //             $('#numPages').empty();
    //         }

    //         if ($('.xcTableWrap:not(.inActive').length === 0) {
    //             RowScroller.empty();
    //         }

    //         moveTableDropdownBoxes();
    //         moveTableTitles();
    //         moveFirstColumn();

    //         // disallow dragging if only 1 table in worksheet
    //         checkTableDraggable();
    //         deferred.resolve();
    //     })
    //     .fail(function(error) {
    //         deferred.reject(error);
    //     });

    //     return (deferred.promise());
    // }

    TblManager.deleteTables = function(tables, tableType, noAlert) {
        // XXX not tested yet!!!
        var deferred = jQuery.Deferred();

        if (!(tables instanceof Array)) {
            tables = [tables];
        }
        // tables is an array, it might be modifed
        // example: pass in gOrphanTables
        var sql = {
            "operation": SQLOps.DeleteTable,
            "tables"   : xcHelper.deepCopy(tables),
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
                var def = delOrphanedHelper(tableName, txId);
                defArray.push(def);
            });
        } else {
            tables.forEach(function(tableId) {
                var def = delTableHelper(tableId, tableType, txId);
                defArray.push(def);
            });
        }

        PromiseHelper.when.apply(window, defArray)
        .then(function() {
            Transaction.done(txId);
            deferred.resolve();
        })
        .fail(function() {
            var success = tableDeleteFailHandler(arguments, tables, noAlert, txId);
            if (success) {
                deferred.resolve(arguments);
            } else {
                deferred.reject(arguments);
            }
        });

        return (deferred.promise());
    };

    TblManager.restoreTableMeta = function(oldgTables) {
        oldgTables = oldgTables || {};
        for (var tableId in oldgTables) {
            var oldMeta = oldgTables[tableId];
            var table = new TableMeta(oldMeta);

            if (table.hasLock()) {
                table.unlock();
                table.beOrphaned();
            }

            gTables[tableId] = table;
        }
    };

    TblManager.pullRowsBulk = function(tableId, jsonObj, startIndex, dataIndex,
                                       direction, rowToPrependTo) {
        // this function does some preparation for ColManager.pullAllCols()
        startIndex = startIndex || 0;
        var $table = $('#xcTable-' + tableId);
        // var $tableWrap = $table.closest('.xcTableWrap');
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
        columnName = columnName.replace(/\"/g, "&quot;");

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
                    '<div class="colGrab"></div>' +
                    '<div class="flexContainer flexRow">' +
                        '<div class="flexWrap flex-left">' +
                            '<div class="iconHidden"></div>' +
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
                                'title="' + TooltipTStr.ViewColumnOptions +
                                '">' +
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
        Dag.destruct(tableId);

        if (gActiveTableId === tableId) {
            gActiveTableId = null;
        }
    };

    TblManager.hideTable = function(tableId) {
        var tableName = gTables[tableId].tableName;
        var $table = $('#xcTable-' + tableId);
        var tableHeight = $table.height();
        $('#xcTableWrap-' + tableId).addClass('tableHidden')
        .find('.tableTitle .dropdownBox').attr({
            "title"              : "",
            "data-original-title": tableName
        });

        var bottomBorderHeight = 5;
        $table.height(tableHeight + bottomBorderHeight);
        matchHeaderSizes($table);
        moveFirstColumn();

        SQL.add("Hide Table", {
            "operation": SQLOps.HideTable,
            "tableName": tableName,
            "tableId"  : tableId
        });
    };

    TblManager.unHideTable = function(tableId) {
        var $tableWrap = $('#xcTableWrap-' + tableId);
        $tableWrap.removeClass('tableHidden')
        .find('.tableTitle .dropdownBox').attr({
            "title"              : "",
            "data-original-title": TooltipTStr.ViewTableOptions
        });
        WSManager.focusOnWorksheet(WSManager.getActiveWS(), false, tableId);

        var $table = $('#xcTable-' + tableId);
        $table.height('auto');
        matchHeaderSizes($table);
        moveFirstColumn();

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

        tableCols.sort(sortFunc);
        function sortFunc(a, b) {
            return xcHelper.sortVals(a.name, b.name, order);
        }

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
        var oldWidthStates = [];
        var newWidthStates = [];

        for (var i = 0, numCols = columns.length; i < numCols; i++) {
            $th = $table.find('th.col' + (colNums[i]));
            oldWidthStates.push(columns[i].sizeToHeader);
            columns[i].sizeToHeader = !sizeToHeader;
            newWidthStates.push(columns[i].sizeToHeader);
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
            "oldWidthStates" : oldWidthStates,
            "newWidthStates" : newWidthStates,
            "htmlExclude"    : ["columnNums", "oldWidthStates",
                                "newWidthStates", "oldColumnWidths",
                                "newColumnWidths"]
        });
    };

    // only used for undo / redos
    TblManager.resizeColsToWidth = function(tableId, colNums, widths, widthStates) {
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
            progCols[colNum - 1].sizeToHeader = widthStates[i];
        }
        matchHeaderSizes($table);
    };

    TblManager.adjustRowFetchQuantity = function() {
        // cannot calculate mainFrame height directly because sometimes
        // it may not be visible
        var mainFrameTop = $('.mainPanel.active').find('.topBar')[0]
                                .getBoundingClientRect().bottom;
        var mainFrameBottom = $('#statusBar').offset().top;
        var mainFrameHeight = mainFrameBottom - mainFrameTop;
        var tableAreaHeight = mainFrameHeight - gFirstRowPositionTop;
        var maxVisibleRows = Math.ceil(tableAreaHeight / gRescol.minCellHeight);
        var buffer = 5;
        var rowsNeeded = maxVisibleRows + gNumEntriesPerPage + buffer;
        gMaxEntriesPerPage = Math.max(rowsNeeded, gMinRowsPerScreen);
        gMaxEntriesPerPage = Math.ceil(gMaxEntriesPerPage / 10) * 10;
    };

    function tableDeleteFailHandler(results, tables, noAlert, txId) {
        var hasSuccess = false;
        var fails = [];
        var errorMsg = "";
        var tablesMsg = "";
        var failedTables = "";
        for (var i = 0, len = results.length; i < len; i++) {
            if (results[i] != null && results[i].error != null) {
                fails.push({tables: tables[i], error: results[i].error});
                failedTables += tables[i] + ", ";
            } else {
                hasSuccess = true;
            }
        }

        var numFails = fails.length;
        if (numFails) {
            failedTables = failedTables.substr(0, failedTables.length - 2);
            if (numFails > 1) {
                tablesMsg = ErrTStr.TablesNotDeleted + " " + failedTables;
            } else {
                tablesMsg = xcHelper.replaceMsg(ErrWRepTStr.TableNotDeleted, {
                    "name": failedTables
                });
            }
        }

        if (hasSuccess) {
            Transaction.done(txId);
            if (numFails && !noAlert) {
                errorMsg = fails[0].error + ". " + tablesMsg;
                Alert.error(StatusMessageTStr.PartialDeleteTableFail, errorMsg);
            }
        } else {
            Transaction.fail(txId, {
                "error"  : fails[0].error + ". " + ErrTStr.NoTablesDeleted,
                "failMsg": StatusMessageTStr.DeleteTableFailed,
                "noAlert": noAlert
            });
        }
        return (hasSuccess);
    }


    function infScrolling(tableId) {
        var $rowScroller = $('#rowScrollerArea');
        var scrolling = false;
        var $xcTbodyWrap = $('#xcTbodyWrap-' + tableId);
        var updateRangeTimer;
        var needsFocusing = true;
        var focusTimer;
        $xcTbodyWrap.scroll(function() {
            if (gMouseStatus === "movingTable") {
                return;
            }
            if ($rowScroller.hasClass('autoScroll')) {
                $rowScroller.removeClass('autoScroll');
                return;
            }

            if (needsFocusing) {
                needsFocusing = false;
                focusTable(tableId);
            }

            clearTimeout(focusTimer);
            focusTimer = setTimeout(scrollingEnd, 200);

            $(".menu:visible").hide();
            removeMenuKeyboardNavigation();
            $('.highlightBox').remove();

            var table = gTables[tableId];
            RowScroller.genFirstVisibleRowNum();
            var $table = $('#xcTable-' + tableId);

            var innerDeferred = jQuery.Deferred();
            var firstRow = $table.find('tbody tr:first');
            var topRowNum = xcHelper.parseRowNum(firstRow);
            var info;
            var numRowsToAdd;
            var adjustRowScrollerRange = false;

            if (firstRow.length === 0) {
                innerDeferred.resolve();
            } else if ($(this).scrollTop() === 0 &&
                !firstRow.hasClass('row0'))
            {
                // scrolling to top
                if (!scrolling) {

                    // var initialTop = firstRow.offset().top;
                    numRowsToAdd = Math.min(gNumEntriesPerPage, topRowNum,
                                            table.resultSetMax);

                    var rowNumber = topRowNum - numRowsToAdd;
                    if (rowNumber < table.resultSetMax) {
                        var lastRowToDisplay = table.currentRowNumber -
                                               numRowsToAdd;
                        scrolling = true;
                        info = {
                            "numRowsToAdd"    : numRowsToAdd,
                            "numRowsAdded"    : 0,
                            "targetRow"       : rowNumber,
                            "lastRowToDisplay": lastRowToDisplay,
                            "bulk"            : false,
                            "tableName"       : table.tableName,
                            "tableId"         : tableId,
                            "currentFirstRow" : topRowNum
                        };

                        goToPage(rowNumber, numRowsToAdd, RowDirection.Top,
                                false, info)
                        .then(function() {
                            innerDeferred.resolve();
                        })
                        .fail(function(error) {
                            innerDeferred.reject(error);
                        })
                        .always(function() {
                            scrolling = false;
                            $('#xcTableWrap-' + tableId).find('.tableCoverWaiting')
                                                .remove();
                        });
                    } else {
                        adjustRowScrollerRange = true;
                    }

                } else {
                    adjustRowScrollerRange = true;
                    innerDeferred.resolve();
                }
            } else if ($(this)[0].scrollHeight - $(this).scrollTop() -
                       $(this).outerHeight() <= 1) {
                // scrolling to bottom

                if (!scrolling && (table.currentRowNumber < table.resultSetMax))
                {
                    scrolling = true;
                    numRowsToAdd = Math.min(gNumEntriesPerPage,
                                    table.resultSetMax -
                                    table.currentRowNumber);
                    info = {
                        "numRowsToAdd"    : numRowsToAdd,
                        "numRowsAdded"    : 0,
                        "targetRow"       : table.currentRowNumber + numRowsToAdd,
                        "lastRowToDisplay": table.currentRowNumber + numRowsToAdd,
                        "bulk"            : false,
                        "tableName"       : table.tableName,
                        "tableId"         : tableId,
                        "currentFirstRow" : topRowNum
                    };

                    goToPage(table.currentRowNumber, numRowsToAdd,
                             RowDirection.Bottom, false, info)
                    .then(function() {
                        innerDeferred.resolve();
                    })
                    .fail(function(error) {
                        innerDeferred.reject(error);
                    })
                    .always(function() {
                        scrolling = false;
                        $('#xcTableWrap-' + tableId).find('.tableCoverWaiting')
                                                    .remove();
                    });
                } else {
                    adjustRowScrollerRange = true;
                    innerDeferred.resolve();
                }
            } else {
                innerDeferred.resolve();
                adjustRowScrollerRange = true;
            }

            if (adjustRowScrollerRange && !scrolling) {
                clearTimeout(updateRangeTimer);
                  // rowscroller range flickers if we update too often
                updateRangeTimer = setTimeout(function() {
                    if (!scrolling) {
                        RowScroller.updateViewRange(tableId);
                    }
                }, 200);
                return;
            }

            innerDeferred
            .then(function() {
                var rowScrollerMove = true;
                RowScroller.genFirstVisibleRowNum(rowScrollerMove);
                clearTimeout(updateRangeTimer);
                // rowscroller range flickers if we update too often
                updateRangeTimer = setTimeout(function() {
                    if (!scrolling) {
                        RowScroller.updateViewRange(tableId);
                    }
                }, 200);
            })
            .fail(function(error) {
                console.error("Scroll Fails!", error);
            });
        });

        function scrollingEnd() {
            needsFocusing = true;
        }
    }


    /**
        This function sets up new tables to be added to the display and
        removes old tables.

        newTableNames is an array of tablenames to be added
        tablesToReplace is an array of old tablenames to be replaced
        tablesToRemove is an array of tableIds to be removed later

        Possible Options:
        afterStartup: boolean to indicate if these tables are added after
                      page load
        lockTable: boolean, if true then this is an intermediate table that will
                   be locked throughout it's active life
        selectCol: number, column to be selected once new table is ready
        isUndo: boolean, default is false. If true, we are adding this table
                through an undo

    */

    function addTable(newTableNames, tablesToReplace, tablesToRemove, options) {
        //XX don't just get first array value
        var newTableId = xcHelper.getTableId(newTableNames[0]);
        var oldId;
        options = options || {};
        var afterStartup = options.afterStartup || false;
        var lockTable = options.lockTable || false;
        var selectCol = options.selectCol;
        var wasTableReplaced = false;

        if (options.isUndo && options.position != null) {
            WSManager.replaceTable(newTableId, null, null,
                                  {position: options.position});
        } else if (tablesToReplace[0] == null) {
            WSManager.replaceTable(newTableId);
        } else {
            oldId = xcHelper.getTableId(tablesToReplace[0]);
            var tablePosition = WSManager.getTablePosition(oldId);

            if (tablePosition > -1) {
                WSManager.replaceTable(newTableId, oldId, tablesToRemove);
                wasTableReplaced = true;
            } else {
                WSManager.replaceTable(newTableId);
            }
        }

        // WSManager.replaceTable need to know oldTable's location
        // so remove table after that
        if (tablesToRemove) {
            var multipleTables = tablesToRemove.length > 1;
            var noFocusWS = false;
            if (multipleTables) {
                noFocusWS = true;
            }
            for (var i = 0; i < tablesToRemove.length; i++) {
                if (wasTableReplaced && tablesToRemove[i] !== oldId) {
                    WSManager.changeTableStatus(tablesToRemove[i],
                                                TableType.Orphan);
                }
                if (gTables[tablesToRemove[i]].status === TableType.Active) {
                    // var orphanOptions = {};
                    if (options.from === TableType.Archived) {
                        TblManager.archiveTable(tablesToRemove[i], {
                            delayTableRemoval: true
                        });
                    } else if (options.from === "noSheet") {
                        TblManager.sendTableToOrphaned(tablesToRemove[i]);
                    } else {
                        TblManager.sendTableToOrphaned(tablesToRemove[i], {
                            "keepInWS" : true,
                            "noFocusWS": noFocusWS
                        });
                    }
                }
            }
        }

        if (lockTable) {
            // replace just the ids instead of the entire table so we won't
            // see the flicker of intermediate tables

            if (oldId == null) {
                oldId = xcHelper.getTableId(tablesToReplace[0]);
            }

            $("#xcTableWrap-" + oldId).removeClass("tableToRemove")
                                .find(".tableTitle .hashName")
                                .text('#' + newTableId);
            $("#rowScroller-" + oldId).attr('id', 'rowScroller-' + newTableId)
                                    .removeClass("rowScrollerToRemove");
            $('#dagWrap-' + oldId).attr('id', 'dagWrap-' + newTableId)
                                .removeClass("dagWrapToRemove");
            changeTableId(oldId, newTableId);

            var table = gTables[newTableId];
            TableList.addTables([table], IsActive.Active);
            return PromiseHelper.resolve(null);
        } else {
            var parallelOptions = {
                afterStartup: afterStartup,
                selectCol   : selectCol
            };
            return (TblManager.parallelConstruct(newTableId, tablesToRemove,
                                                 parallelOptions));
        }
    }

    // used for recreating undone tables in refreshTables
    function setResultSet(tableName) {
        var deferred = jQuery.Deferred();
        var tableId = xcHelper.getTableId(tableName);
        var table = gTables[tableId];

        table.updateResultset()
        .then(function() {
            table.beActive();
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
        var leftPos = ($('#xcTableWrap-' + tableId).position().left -
                        MainMenu.getOffset()) + $('#mainFrame').scrollLeft();
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
                var firstRow = $table.find('tbody tr:first');
                var topRowNum = xcHelper.parseRowNum(firstRow);
                var info = {
                    "numRowsToAdd"    : numRowsStillNeeded,
                    "numRowsAdded"    : 0,
                    "targetRow"       : table.currentRowNumber + numRowsStillNeeded,
                    "lastRowToDisplay": table.currentRowNumber + numRowsStillNeeded,
                    "bulk"            : false,
                    "dontRemoveRows"  : true,
                    "tableName"       : tableName,
                    "tableId"         : tableId,
                    "currentFirstRow" : topRowNum
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
                        })
                        .always(function() {
                            $('#xcTableWrap-' + tableId)
                                            .find('.tableCoverWaiting')
                                            .remove();
                        });
            }
        })
        .then(function() {
            autoSizeDataCol(tableId, progCols);
            // position sticky row column on visible tables
            moveFirstColumn();
            RowScroller.updateViewRange(tableId);
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
                var mousedown = fakeEvent.mousedown;
                mousedown.bypassModal = true;
                $table.find('th.col' + (options.selectCol) +
                            ' .flexContainer').trigger(mousedown);
            }
        }

        if (numRows === 0) {
            $table.find('.idSpan').text("");
        }
    }

    function createTableHeader(tableId) {
        var $xcTheadWrap = $('<div id="xcTheadWrap-' + tableId +
                             '" class="xcTheadWrap dataTable" ' +
                             '" data-id="' + tableId + '" ' +
                             'style="top:0px;"></div>');

        $('#xcTableWrap-' + tableId).prepend($xcTheadWrap);

        // var tableName = "";
        // build this table title somewhere else
        // var table = gTables[tableId];
        // if (table != null) {
        //     tableName = table.tableName;
        // }
        var tableTitleClass = "";
        if ($('.xcTable:visible').length === 1) {
            tableTitleClass = " tblTitleSelected";
            $('.dagWrap.selected').removeClass('selected').addClass('notSelected');
            $('#dagWrap-' + tableId).removeClass('notSelected')
                                    .addClass('selected');
        }

        var html = '<div class="tableTitle ' + tableTitleClass + '">' +
                        '<div class="tableGrab"></div>' +
                        '<div class="labelWrap">' +
                            '<label class="text" ></label>' +
                        '</div>' +
                        '<div class="dropdownBox" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="bottom" ' +
                            'data-container="body" ' +
                            'title="' + TooltipTStr.ViewTableOptions +
                            '" >' +
                            '<span class="innerBox"></span>' +
                        '</div>' +
                    '</div>';

        $xcTheadWrap.prepend(html);

        //  title's Format is tablename  [cols]
        updateTableHeader(tableId);

        // Event Listener for table title
        $xcTheadWrap.on({
            // must use keypress to prevent contenteditable behavior
            "keypress": function(event) {
                if (event.which === keyCode.Enter) {
                    event.preventDefault();
                    event.stopPropagation();
                    renameTableHelper($(this));
                }
            },
            "keydown": function(event) {
                if (event.which === keyCode.Space) {
                    // XXX temporary do not allow space
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        }, ".tableTitle .text");

        $xcTheadWrap.on({
            "focus": function() {
                var val = $(this).val();
                var width = getTextWidth($(this), val);
                $(this).width(width + 1);
                $(this)[0].setSelectionRange(val.length, val.length);
                moveTableTitles();
            },
            "blur": function() {
                updateTableHeader(null, $(this).parent());
                moveTableTitles();
            },
            "input": function() {
                var width = getTextWidth($(this), $(this).val());
                $(this).width(width + 1);
                moveTableTitles($(this).closest('.xcTableWrap'));
            }
        }, ".tableTitle .tableName");

        $xcTheadWrap[0].oncontextmenu = function(event) {
            var $target = $(event.target).closest('.dropdownBox');
            if ($target.length) {
                $target.trigger('click');
                event.preventDefault();
            }
        };

        $xcTheadWrap.on('click', '.tableTitle > .dropdownBox', function(event) {
            var classes = "tableMenu";
            var $dropdown = $(this);
            var $tableWrap = $dropdown.closest('.xcTableWrap');


            if ($tableWrap.hasClass('tableLocked')) {
                classes += " locked";
            }

            if ($tableWrap.hasClass('tableHidden')) {
                classes += " tableHidden";
            }

            var options = {"classes": classes};

            if (event.rightClick) {
                options.mouseCoors = {
                    "x": event.pageX,
                    "y": $dropdown.offset().top + 30
                };
            }

            xcHelper.dropdownOpen($dropdown, $('#tableMenu'), options);
        });

        // Change from $xcTheadWrap.find('.tableGrab').mosedown...
        $xcTheadWrap.on('mousedown', '.tableGrab', function(event) {
            // Not Mouse down
            if (event.which !== 1) {
                return;
            }
            TblAnim.startTableDrag($(this).parent(), event);
        });

        $xcTheadWrap.on('click', '.tableGrab', function(event) {
            var $target = $(this);
            if (!$(this).hasClass('noDropdown')) {
                var click = $.Event("click");
                click.rightClick = true;
                click.pageX = event.pageX;
                $target.siblings('.dropdownBox').trigger(click);
                event.preventDefault();
            }
        });

        $xcTheadWrap[0].oncontextmenu = function(event) {
            var $target = $(event.target).closest('.tableGrab');
            if ($target.length) {
                var click = $.Event("click");
                click.rightClick = true;
                click.pageX = event.pageX;
                $target.siblings('.dropdownBox').trigger(click);
                event.preventDefault();
            }
        };

        var $table = $('#xcTable-' + tableId);
        $table.width(0);
        matchHeaderSizes($table);
    }

    function addTableListeners(tableId) {
        var $xcTableWrap = $('#xcTableWrap-' + tableId);
        var oldId = gActiveTableId;
        $xcTableWrap.mousedown(function() {
            if (gActiveTableId === tableId ||
                $xcTableWrap.hasClass('tableOpSection')) {
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
        var $jsonEle = newCells.find('.jsonElement');
        $jsonEle.dblclick(showJSONMoal);
        $jsonEle.on("click", ".icon", showJSONMoal);

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

        function showJSONMoal() {
            if ($('#mainFrame').hasClass('modalOpen') &&
                !$(this).closest('.xcTableWrap').hasClass('jsonModalOpen'))
            {
                return;
            }
            JSONModal.show($(this).closest(".jsonElement"));
        }
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
            if ($table.closest('.columnPicker').length || 
                ($("#mainFrame").hasClass("modalOpen") && !event.bypassModal)) {
                // not focus when in modal unless bypassModa is true
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
            if ($thead.closest('.modalOpen').length || 
                $thead.closest('.xcTableWrap').hasClass('columnPicker')) {
                return;
            }
            $thead.find('.editableHead').each(function() {
                highlightColumn($(this), true);
            });
        });

        $thead.on("click", ".dropdownBox", function(event) {
            // if ($table.closest('.columnPicker').length ||
            if (
                $("#mainFrame").hasClass("modalOpen")) {
                // not focus when in modal
                return;
            }
            var options = {};
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

            xcHelper.dropdownOpen($el, $("#colMenu"), options);
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

            if ($table.closest('.columnPicker').length || 
                $("#mainFrame").hasClass("modalOpen")) {
                // not focus when in modal
                return;
            }

            if (event.which !== 1 || $el.length === 0) {
                return;
            }
            if ($td.hasClass('jsonElement')) {
                $('.menu').hide();
                removeMenuKeyboardNavigation();
                $('.highlightBox').remove();
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

            xcHelper.dropdownOpen($el, $('#cellMenu'), {
                "colNum"    : colNum,
                "rowNum"    : rowNum,
                "classes"   : "tdMenu", // specify classes to update colmenu's class attr
                "mouseCoors": {"x": event.pageX, "y": yCoor},
                "shiftKey"  : event.shiftKey,
                "isMutiCol" : isMultiColumn(),
                "isUnSelect": isUnSelect,
                "floating"  : true
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
            var isDataTd = $td.hasClass('jsonElement');
            if ($div.length === 0) {
                // when click sth like row marker cell, rowGrab
                return false;
            }
            if ($table.closest('.columnPicker').length || 
                $("#mainFrame").hasClass("modalOpen")) {
                $el.trigger('click');
                // not focus when in modal
                return false;
            }
            var yCoor = Math.max(event.pageY, $div.offset().top + $div.height() - 10);
            var colNum = xcHelper.parseColNum($td);
            var rowNum = xcHelper.parseRowNum($td.closest("tr"));

            $(".tooltip").hide();
            resetColMenuInputs($el);

            if ($td.find(".highlightBox").length === 0) {
                // same as singleSelection()
                $(".highlightBox").remove();
                highlightCell($td, tableId, rowNum, colNum);
            }

            xcHelper.dropdownOpen($div, $("#cellMenu"), {
                "colNum"    : colNum,
                "rowNum"    : rowNum,
                "classes"   : "tdMenu", // specify classes to update colmenu's class attr
                "mouseCoors": {"x": event.pageX, "y": yCoor},
                "isMutiCol" : isMultiColumn(),
                "isDataTd"  : isDataTd
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
                    ' title="' + TooltipTStr.SelectAllColumns + '" ' +
                    'data-toggle="tooltip"' +
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
                if (!columns[i].isHidden && width === 'auto') {
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
                            ' data-container="body"' +
                            ' data-toggle="tooltip" data-placement="top" ' +
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

    function renameTableHelper($div) {
        var newName = $div.find(".tableName").val().trim();
        var $th = $div.closest('.xcTheadWrap');
        var tableId = xcHelper.parseTableId($th);
        var newTableName = newName + "#" + tableId;
        var oldTableName = gTables[tableId].getName();

        if (newTableName === oldTableName) {
            $div.blur();
            return;
        }

        var isValid = xcHelper.validate([
            {
                "$selector": $div.find(".tableName"),
                "text"     : ErrTStr.NoSpecialChar,
                "check"    : function() {
                    return xcHelper.hasSpecialChar(newName);
                }
            },
            {
                "$selector": $div.find(".tableName"),
                "text"     : ErrTStr.InvalidColName,
                "check"    : function() {
                    return (newName.length === 0);
                }
            },
            {
                "$selector": $div.find(".tableName"),
                "text"     : ErrTStr.TooLong,
                "check"    : function() {
                    return (newName.length >=
                            XcalarApisConstantsT.XcalarApiMaxTableNameLen);
                }
            }
        ]);

        if (!isValid) {
            return;
        }

        // XXX Shall we really check if the name part has conflict?
        var validName = xcHelper.checkDupTableName(newName);
        if (validName) {
            xcFunction.rename(tableId, newTableName)
            .then(function() {
                $div.blur();
            })
            .fail(function(error) {
                StatusBox.show(error, $div, false);
            });
        } else {
            var text = xcHelper.replaceMsg(ErrWRepTStr.TableConflict, {
                "name": newName
            });
            StatusBox.show(text, $div, false);
        }
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

            if (tableType === TableType.Active) {
                // when delete active table
                TblManager.archiveTable(tableId, {del: ArchiveTable.Delete});

                setTimeout(function() {
                    var activeTable = gTables[gActiveTableId];
                    if (activeTable && activeTable.resultSetCount !== 0) {
                        RowScroller.genFirstVisibleRowNum();
                    }
                }, 300);
            } else if (tableType === TableType.Archived) {
                TableList.removeTable(tableId);
            }

            delete gTables[tableId];

            deferred.resolve();
        })
        .fail(function(error) {
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    function delOrphanedHelper(tableName, txId) {
        var deferred = jQuery.Deferred();

        XcalarDeleteTable(tableName, txId)
        .then(function() {
            var tableIndex = gOrphanTables.indexOf(tableName);
            gOrphanTables.splice(tableIndex, 1);
            Dag.makeInactive(tableName, true);
            TableList.removeTable(tableName, TableType.Orphan);

            var tableId = xcHelper.getTableId(tableName);
            if (tableId != null && gTables[tableId] != null) {
                WSManager.removeTable(tableId);
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
            var minWidth = 200;
            if (winWidth > 1400) {
                maxWidth = 600;
            } else if (winWidth > 1100) {
                maxWidth = 500;
            }
            if (dataCol.isHidden) {
                dataCol.width = minWidth;
                return;
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
