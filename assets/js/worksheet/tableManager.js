window.TblManager = (function($, TblManager) {

    /**
        This function takes in an array of newTable names to be added,
        an array of tableCols, worksheet that newTables will add to and an array
        of oldTable names that will be modified due to a function.
        Inside oldTables, if there is an anchor table, we move it to the start
        of the array. If there is a need for more than 1 piece of information,
        then oldTables need to be an array of structs
        Possible Options:
        -focusWorkspace: boolean to determine whether we should focus back on
                            workspace, we focus on workspace when adding a table
                            from the datastores panel
        -afterStartup: boolean, default is true. Set to false if tables are
                      being added during page load
        -selectCol: number. column to be highlighted when table is ready
        -isUndo: boolean, default is false. Set to true if this table is being
                  created from an undo operation,
        -position: int, used to place a table in a certain spot if not replacing
                        an older table. Currently has to be paired with undo or
                        redo,
        -replacingDest: string, where to send old tables that are being replaced
    */
    TblManager.refreshTable = function(newTableNames, tableCols, oldTableNames,
                                       worksheet, txId, options)
    {
        var deferred = jQuery.Deferred();
        options = options || {};

        if (txId != null && Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
            return (deferred.promise());
        }

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
        if (!tableCols || tableCols.length === 0) {
            if (!gTables[newTableId] || // Short circuit
                gTables[newTableId].status === TableType.Orphan) {
                TableList.removeTable(newTableName);
            } else {
                TableList.removeTable(newTableId);
            }
            // if no tableCols provided but gTable exists,
            // columns are already set
            if (gTables[newTableId]) {
                promise = setResultSet(newTableName);
            } else {
                promise = TblManager.setgTable(newTableName,
                                               [ColManager.newDATACol()],
                                               {"isActive": true});
            }
        } else {
            var setOptions = {"isActive": true};
            promise = TblManager.setgTable(newTableName, tableCols, setOptions);
        }

        promise
        .then(function() {
            if (txId != null) {
                if (Transaction.checkAndSetCanceled(txId)) {
                    deferred.reject(StatusTStr[StatusT.StatusCanceled]);
                    return;
                } else {
                    // we cannot allow transactions to be canceled if
                    // we're about to add a table to the worksheet
                    Transaction.disableCancel(txId);
                }
            }

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
                "afterStartup" : true,
                "selectCol"    : options.selectCol,
                "isUndo"       : options.isUndo,
                "position"     : options.position,
                "from"         : options.from,
                "replacingDest": options.replacingDest
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
                    delete gTables[newTableId];
                }
                deferred.reject(error);
            });
        })
        .fail(function(error) {
            console.error("set gTables fails!", error);
            if (worksheet != null) {
                WSManager.removeTable(newTableId);
            }
            deferred.reject(error);
        });

        return deferred.promise();
    };

    function setTablesToReplace(oldTableNames, worksheet, tablesToReplace,
                                tablesToRemove) {
        var oldTableIds = oldTableNames.map(function(oldName) {
            return xcHelper.getTableId(oldName);
        });

        if (oldTableNames.length === 1) {
            // only have one table to remove
            tablesToReplace.push(oldTableNames[0]);
        } else {
            // find the first table in the worksheet,
            // that is the target worksheet
            // var targetTable;
            var wsTables = WSManager.getWSById(worksheet).tables;
            for (var i = 0, len = wsTables.length; i < len; i++) {
                var index = oldTableIds.indexOf(wsTables[i]);
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

        oldTableIds.forEach(function(oldTableId) {
            if (!tablesToRemove.includes(oldTableId)) {
                // if oldTableId alredy exists (like self join)
                // not add again
                tablesToRemove.push(oldTableId);
            }
        });
    }

    /*
        This functions adds new tables to the display and the dag at the same
        time.

        Possible Options:
        afterStartup: boolean to indicate if the table is added after page load
        selectCol: number. column to be highlighted when table is ready
    */
    TblManager.parallelConstruct = function(tableId, tablesToRemove, options) {
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
    */
    TblManager.setgTable = function(tableName, tableCols, options) {
        var deferred = jQuery.Deferred();
        var tableId = xcHelper.getTableId(tableName);
        options = options || {};

        if (tableCols == null) {
            // at last have data col
            tableCols = [ColManager.newDATACol()];
        }

        var table = new TableMeta({
            "tableId"  : tableId,
            "tableName": tableName,
            "tableCols": tableCols
        });

        if (options.isActive) {
            // the table is in active worksheet, should have meta from backend
            // table.currentRowNumber = 0;

            table.getMetaAndResultSet()
            .then(function() {
                gTables[tableId] = table;
                deferred.resolve();
            })
            .fail(deferred.reject);
        } else {
            // table is in inactive list or orphaned list, no backend meta
            gTables[tableId] = table;
            deferred.resolve();
        }

        return deferred.promise();
    };

    /*
        Sets gTable meta data, specially for orphan table
    */
    TblManager.setOrphanTableMeta = function(tableName, tableCols) {
        if (tableCols == null) {
            // at last have data col
            tableCols = [ColManager.newDATACol()];
        }

        var tableId = xcHelper.getTableId(tableName);
        var table = new TableMeta({
            "tableId"  : tableId,
            "tableName": tableName,
            "tableCols": tableCols,
            "status"   : TableType.Orphan
        });

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
        SQL.add('Hide Table', {
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
    // remove: boolean, if true will remove table from html immediately
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

    TblManager.sendTableToUndone = function(tableId, options) {
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
                WSManager.changeTableStatus(tableId, TableType.Undone);
            }

            table.beUndone();
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

    // noLog: boolean, if we are deleting undone tables, we do not log this
    //              transaction
    TblManager.deleteTables = function(tables, tableType, noAlert, noLog) {
        // XXX not tested yet!!!
        var deferred = jQuery.Deferred();

        // tables is an array, it might be modifed
        // example: pass in gOrphanTables
        if (!(tables instanceof Array)) {
            tables = [tables];
        }

        tables = tables.filter(function(tableIdOrName) {
            return vefiryTableType(tableIdOrName, tableType);
        });

        var txId;
        if (!noLog) {
            var sql = {
                "operation": SQLOps.DeleteTable,
                "tables"   : xcHelper.deepCopy(tables),
                "tableType": tableType
            };
            txId = Transaction.start({
                "operation": SQLOps.DeleteTable,
                "sql"      : sql
            });
        }

        var defArray = [];
        var tableNames = [];

        if (tableType === TableType.Orphan) {
            // delete orphaned
            tables.forEach(function(tableName) {
                tableNames.push(tableName);
                var def = delOrphanedHelper(tableName, txId);
                defArray.push(def);
            });
        } else if (tableType === TableType.Undone) {
            tables.forEach(function(tableId) {
                tableNames.push(gTables[tableId].getName());
                var def = delUndoneTableHelper(tableId);
                defArray.push(def);
            });
        } else {
            tables.forEach(function(tableId) {
                tableNames.push(gTables[tableId].getName());
                var def = delTableHelper(tableId, tableType, txId);
                defArray.push(def);
            });
        }

        PromiseHelper.when.apply(window, defArray)
        .then(function() {
            if (!noLog) {
                Transaction.done(txId);
            }

            if (tableType === TableType.Undone) {
                KVStore.commit();
            }
            deferred.resolve();
        })
        .fail(function() {
            var res = tableDeleteFailHandler(arguments, tableNames);
            res.errors = arguments;
            if (res.hasSuccess) {
                if (!noLog) {
                    sql.tables = res.successTables;
                    Transaction.done(txId, {
                        "sql": sql
                    });

                    if (res.fails && !noAlert) {
                        Alert.error(StatusMessageTStr.PartialDeleteTableFail,
                                    res.errorMsg);
                    }
                }

                if (tableType === TableType.Undone) {
                    KVStore.commit();
                }
                deferred.resolve(res);
            } else {
                if (!noLog) {
                    Transaction.fail(txId, {
                        "error"  : res.errorMsg,
                        "failMsg": StatusMessageTStr.DeleteTableFailed,
                        "noAlert": noAlert
                    });
                }
                deferred.reject(res);
            }
        });

        return (deferred.promise());
    };

    function vefiryTableType(tableIdOrName, expectTableType) {
        var currentTableType = null;
        var tableId = null;

        if (expectTableType === TableType.Orphan) {
            tableId = xcHelper.getTableId(tableIdOrName);
        } else {
            tableId = tableIdOrName;
        }

        if (tableId != null && gTables.hasOwnProperty(tableId)) {
            currentTableType = gTables[tableId].getType();
        } else {
            currentTableType = TableType.Orphan;
        }

        if (currentTableType === expectTableType) {
            return true;
        } else {
            console.warn("Table", tableIdOrName, "'s' type mismatch",
                        "type is", currentTableType,
                        "expected type is", expectTableType);
            return false;
        }
    }

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

    TblManager.pullRowsBulk = function(tableId, jsonData, startIndex,
                                       direction, rowToPrependTo) {
        // this function does some preparation for ColManager.pullAllCols()
        startIndex = startIndex || 0;
        var $table = $('#xcTable-' + tableId);
        var newCells = ColManager.pullAllCols(startIndex, jsonData, tableId,
                                                direction, rowToPrependTo);
        addRowListeners(newCells);
        adjustRowHeights(newCells, startIndex, tableId);

        var idColWidth = getTextWidth($table.find('tr:last td:first'));
        var newWidth = Math.max(idColWidth, 22);
        var padding = 12;
        $table.find('th:first-child').width(newWidth + padding);
        matchHeaderSizes($table);
    };

    TblManager.getColHeadHTML = function(colNum, tableId, options) {
        options = options || {};

        var table = gTables[tableId];
        xcHelper.assert(table != null);

        var progCol = table.getCol(colNum);
        xcHelper.assert(progCol != null);

        var colName = progCol.getFrontColName();
        var width = progCol.getWidth();
        var columnClass = options.columnClass || "";
        var indexed = (progCol.getBackColName() === table.getKeyName());
        var sortIcon = '<i class="sortIcon"></i>'; // placeholder

        if (progCol.hasHidden()) {
            width = 15;
            columnClass += " userHidden";
        }

        if (indexed) {
            columnClass += " indexedColumn";
            if (!table.showIndexStyle()) {
                columnClass += " noIndexStyle";
            }

            var order = table.getOrdering();
            if (order === XcalarOrderingT.XcalarOrderingAscending) {
                sortIcon = '<i class="sortIcon icon ' +
                            'xi-arrowtail-up fa-12"></i>';
            } else if (order === XcalarOrderingT.XcalarOrderingDescending) {
                sortIcon = '<i class="sortIcon icon ' +
                            'xi-arrowtail-down fa-12"></i>';
            }
        } else if (progCol.isEmptyCol()) {
            columnClass += " newColumn";
        }

        // remove the beginning and end space
        columnClass = columnClass.trim();

        var disabledProp;
        var editableClass;

        if (colName === "") {
            disabledProp = "";
            editableClass = " editable";
        } else {
            disabledProp = "disabled";
            editableClass = "";
        }
        colName = colName.replace(/\"/g, "&quot;");

        // var tooltip = indexed ? ' title="Indexed Column" data-toggle="tooltip" ' +
        //                  'data-placement="top" data-container="body"': "";
        // xx conflicts with tablename on hover;
        var tooltip = "";

        var prefix = progCol.getPrefix();
        var prefixColor = "";
        var prefixClass = "prefix";

        if (prefix === "") {
            prefix = CommonTxtTstr.Immediates;
            prefixClass += " immediate";
        } else {
            prefixColor = TPrefix.getColor(prefix);
        }

        var th =
            '<th class="th ' + columnClass + ' col' + colNum + '"' +
            ' style="width:' + width + 'px;">' +
                '<div class="header' + editableClass + ' ">' +
                    '<div class="dragArea">' +
                        '<div class="iconHelper" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="top" ' +
                            'data-container="body">' +
                        '</div>' +
                    '</div>' +
                    '<div class="colGrab"></div>' +
                    '<div class="topHeader" data-color="' + prefixColor + '">' +
                        sortIcon +
                        '<div class="' + prefixClass + '">' +
                            prefix +
                        '</div>' +
                        '<div class="dotWrap">' +
                            '<div class="dot"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="flexContainer flexRow">' +
                        '<div class="flexWrap flex-left">' +
                            '<div class="iconHidden"></div>' +
                            '<span class="type icon"></span>' +
                        '</div>' +
                        '<div class="flexWrap flex-mid' + editableClass +
                            '"' + tooltip + '>' +
                            '<input class="editableHead tooltipOverflow ' +
                                'col' + colNum + '"' +
                                ' type="text"  value="' + colName + '"' +
                                ' size="15" spellcheck="false" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="top" ' +
                                'data-container="body" '+
                                'data-original-title="' + colName + '" ' +
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

        return (th);
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

        SQL.add("Minimize Table", {
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

        SQL.add("Maximize Table", {
            "operation": SQLOps.UnhideTable,
            "tableName": gTables[tableId].tableName,
            "tableId"  : tableId
        });
    };

    TblManager.sortColumns = function(tableId, direction) {
        var table = gTables[tableId];
        var oldOrder = []; // to save the old column order
        var order = (direction === "reverse") ? ColumnSortOrder.descending :
                                                ColumnSortOrder.ascending;
        var numCols = table.getNumCols();
        var dataCol = null;

        if (table.getCol(numCols).isDATACol()) {
            dataCol = table.removeCol(numCols);
            numCols--;
        }

        var colNumMap = {};
        var thLists = [];
        var $table = $("#xcTable-" + tableId);
        // record original position of each column
        for (var colNum = 1; colNum <= numCols; colNum++) {
            var progCol = table.getCol(colNum);
            colNumMap[progCol.getBackColName()] = colNum;
            var $th = $table.find("th.col" + colNum);
            thLists[colNum] = $th;
        }

        table.sortCols(order);

        var $rows = $table.find('tbody tr');
        var numRows = $rows.length;
        // loop through each column
        for (var i = 0; i < numCols; i++) {
            var newColNum = i + 1;
            var newProgCol = table.getCol(newColNum);
            var oldColNum = colNumMap[newProgCol.getBackColName()];
            var $thToMove = thLists[oldColNum];

            $thToMove.removeClass("col" + oldColNum)
                    .addClass("col" + newColNum)
                .find(".col" + oldColNum)
                .removeClass("col" + oldColNum)
                .addClass("col" + newColNum);

            // after move th, the position is different from the oldColNum
            var oldPos = $thToMove.index();
            $table.find("th").eq(i).after($thToMove);
            // loop through each row and order each td
            for (var j = 0; j < numRows; j++) {
                var $row = $rows.eq(j);
                var $tdToMove = $row.find("td").eq(oldPos);
                $tdToMove.removeClass("col" + oldColNum)
                         .addClass("col" + newColNum);
                $row.find("td").eq(i).after($tdToMove);
            }

            oldOrder.push(oldColNum - 1);
        }

        if (dataCol != null) {
            // if data col was removed from sort, put it back
            table.addCol(numCols + 1, dataCol);
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
            oldWidthStates.push(columns[i].sizedToHeader);
            columns[i].sizedToHeader = sizeToHeader;
            newWidthStates.push(columns[i].sizedToHeader);
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
            if (!widths[i]) {
                console.warn('not found');
            }
            $table.find('th.col' + colNum).outerWidth(widths[i]);
            progCols[colNum - 1].width = widths[i];
            progCols[colNum - 1].sizedToHeader = widthStates[i];
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

    TblManager.bookmarkRow = function(rowNum, tableId) {
        //XXX allow user to select color in future?
        var $table = $('#xcTable-' + tableId);
        var $td = $table.find('.row' + rowNum + ' .col0');
        var table = gTables[tableId];

        $td.addClass('rowBookmarked');
        xcTooltip.changeText($td.find('.idSpan'), TooltipTStr.Bookmarked);
        $('.tooltip').hide();
        RowScroller.addBookmark(rowNum, tableId);
        table.addBookmark(rowNum);

        SQL.add("Bookmark Row", {
            "operation": SQLOps.BookmarkRow,
            "tableId"  : tableId,
            "tableName": table.getName(),
            "rowNum"   : rowNum
        });
    };

    TblManager.unbookmarkRow = function(rowNum, tableId) {
        var $table = $('#xcTable-' + tableId);
        var $td = $table.find('.row' + rowNum + ' .col0');
        var table = gTables[tableId];

        $td.removeClass('rowBookmarked');
        xcTooltip.changeText($td.find('.idSpan'), TooltipTStr.Bookmark);
        $('.tooltip').hide();
        RowScroller.removeBookmark(rowNum, tableId);
        table.removeBookmark(rowNum);

        SQL.add("Remove Bookmark", {
            "operation": SQLOps.RemoveBookmark,
            "tableId"  : tableId,
            "tableName": table.getName(),
            "rowNum"   : rowNum
        });
    };

    TblManager.updateHeaderAndListInfo = function(tableId) {
        updateTableHeader(tableId);
        TableList.updateTableInfo(tableId);
        var $table = $('#xcTable-' + tableId);
        matchHeaderSizes($table);
    };

    // returns {
    //    hasSuccess:boolean,
    //    fails: [{tables: "tableName", error: "error"}]
    //    successTables: []
    // }
    function tableDeleteFailHandler(results, tables) {
        var hasSuccess = false;
        var fails = [];
        var errorMsg = "";
        var tablesMsg = "";
        var failedTablesStr = "";
        var successTables = [];
        for (var i = 0, len = results.length; i < len; i++) {
            if (results[i] != null && results[i].error != null) {
                fails.push({tables: tables[i], error: results[i].error});
                failedTablesStr += tables[i] + ", ";
            } else {
                hasSuccess = true;
                successTables.push(tables[i]);
            }
        }

        var numFails = fails.length;
        if (numFails) {
            failedTablesStr = failedTablesStr.substr(0,
                              failedTablesStr.length - 2);
            if (numFails === 1) {
                tablesMsg = xcHelper.replaceMsg(ErrWRepTStr.TableNotDeleted, {
                    "name": failedTablesStr
                });
            } else { // numFails > 1
                tablesMsg = ErrTStr.TablesNotDeleted + " " + failedTablesStr;
            }
        }

        if (hasSuccess) {
            errorMsg = fails[0].error + ". " + tablesMsg;
        } else {
            errorMsg = fails[0].error + ". " + ErrTStr.NoTablesDeleted;
        }

        return {
            "hasSuccess"   : hasSuccess,
            "fails"        : fails,
            "errorMsg"     : errorMsg,
            "successTables": successTables
        };
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
                if ($table.find('.jsonElement.modalHighlighted').length) {
                    JSONModal.rehighlightTds($table);
                }
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
        -afterStartup: boolean to indicate if these tables are added after
                      page load
        -selectCol: number, column to be selected once new table is ready
        -isUndo: boolean, default is false. If true, we are adding this table
                through an undo,
        -replacingDest: string, where to send old tables that are being replaced
    */
    function addTable(newTableNames, tablesToReplace, tablesToRemove, options) {
        //XX don't just get first array value
        var newTableId = xcHelper.getTableId(newTableNames[0]);
        var oldId;
        options = options || {};
        var afterStartup = options.afterStartup || false;
        var selectCol = options.selectCol;
        var wasTableReplaced = false;

        if (options.isUndo && options.position != null) {
            WSManager.replaceTable(newTableId, null, null, {
                position    : options.position,
                removeToDest: options.replacingDest
            });
        } else if (tablesToReplace[0] == null) {
            WSManager.replaceTable(newTableId);
        } else {
            oldId = xcHelper.getTableId(tablesToReplace[0]);
            var tablePosition = WSManager.getTablePosition(oldId);

            if (tablePosition > -1) {
                WSManager.replaceTable(newTableId, oldId, tablesToRemove, {
                    removeToDest: options.replacingDest
                });
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
                        if (options.replacingDest === TableType.Undone) {
                            TblManager.sendTableToUndone(tablesToRemove[i], {
                                "keepInWS" : true,
                                "noFocusWS": noFocusWS
                            });
                        } else {
                            TblManager.sendTableToOrphaned(tablesToRemove[i], {
                                "keepInWS" : true,
                                "noFocusWS": noFocusWS
                            });
                        }
                    }
                }
            }
        }

        var parallelOptions = {
            afterStartup: afterStartup,
            selectCol   : selectCol
        };
        return (TblManager.parallelConstruct(newTableId, tablesToRemove,
                                             parallelOptions));
    }

    // used for recreating undone tables in refreshTables
    function setResultSet(tableName) {
        var deferred = jQuery.Deferred();
        var tableId = xcHelper.getTableId(tableName);
        var table = gTables[tableId];

        table.getMetaAndResultSet()
        .then(function() {
            table.beActive();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
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
        xcHelper.centerFocusedTable(tableId, true)
        .then(function() {
            RowScroller.genFirstVisibleRowNum();
        });
    }

    /*
        Start the process of building table
        Possible Options:
        selectCol: number. column to be highlighted when table is ready
    */
    function startBuildTable(tableId, tablesToRemove, options) {
        var deferred = jQuery.Deferred();
        var table = gTables[tableId];
        var tableName = table.getName();


        getFirstPage(table)
        .then(function(jsonData) {
            if (tablesToRemove) {
                for (var i = 0, len = tablesToRemove.length; i < len; i++) {
                    var tblId = tablesToRemove[i];
                    $("#xcTableWrap-" + tblId).remove();
                    $("#rowScroller-" + tblId).remove();
                }
            }
            table.currentRowNumber = jsonData.length;
            buildInitialTable(tableId, jsonData, options);

            var $table = $('#xcTable-' + tableId);
            var requiredNumRows = Math.min(gMaxEntriesPerPage,
                                              table.resultSetCount);
            var numRowsStillNeeded = requiredNumRows -
                                     $table.find('tbody tr').length;
            if (numRowsStillNeeded > 0) {
                var firstRow = $table.find('tbody tr:first');
                var topRowNum = xcHelper.parseRowNum(firstRow);
                var targetRow = table.currentRowNumber + numRowsStillNeeded;
                var info = {
                    "numRowsToAdd"    : numRowsStillNeeded,
                    "numRowsAdded"    : 0,
                    "targetRow"       : targetRow,
                    "lastRowToDisplay": targetRow,
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
                                if (typeof options.selectCol === "object") {
                                    $table.find('th.col' +
                                                 options.selectCol[0] +
                                                ' .flexContainer').mousedown();
                                    for (var i = 0;
                                         i < options.selectCol.length; i++) {
                                        var $th = $table
                                        .find('th.col' + options.selectCol[i]);
                                        highlightColumn($th, true);
                                    }
                                } else {
                                    $table.find('th.col' + options.selectCol +
                                            ' .flexContainer').mousedown();
                                }
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
            autoSizeDataCol(tableId);
            // position sticky row column on visible tables
            moveFirstColumn();
            RowScroller.updateViewRange(tableId);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("startBuildTable fails!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /*
        Possible Options:
        selectCol: number. column to be highlighted when table is ready
    */
    function buildInitialTable(tableId, jsonData, options) {
        generateTableShell(tableId);
        var numRows = jsonData.length;
        var startIndex = 0;
        var $table = $('#xcTable-' + tableId);
        RowScroller.add(tableId);

        if (numRows === 0) {
            console.log('no rows found, ERROR???');
            $('#rowScroller-' + tableId).addClass('hidden');
            $table.addClass('emptyTable');
            jsonData = [""];
        }

        TblManager.pullRowsBulk(tableId, jsonData, startIndex);
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
                if (typeof options.selectCol === "object") {
                    $table.find('th.col' + options.selectCol[0] +
                            ' .flexContainer').trigger(mousedown);
                    for (var i = 0; i < options.selectCol.length; i++) {
                        var $th = $table
                        .find('th.col' + options.selectCol[i]);
                        highlightColumn($th, true);
                    }
                } else {
                    $table.find('th.col' + (options.selectCol) +
                                ' .flexContainer').trigger(mousedown);
                }
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
                var $tableName = $(this);
                updateTableNameWidth($tableName);
                moveTableTitles();
            },
            "blur": function() {
                var tableId = $xcTheadWrap.data("id");
                updateTableHeader(tableId);
                moveTableTitles();
            },
            "input": function() {
                var $tableName = $(this);
                updateTableNameWidth($tableName);
                moveTableTitles($tableName.closest('.xcTableWrap'));
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
                    "y": $tableWrap.offset().top + 30
                };
            }

            xcHelper.dropdownOpen($dropdown, $('#tableMenu'), options);
        });

        // Change from $xcTheadWrap.find('.tableGrab').mousedown...
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

    function updateTableHeader(tableId) {
        var table = gTables[tableId];
        var fullTableName = table.getName();
        var numCols = table.getNumCols() - 1; // skip DATA col
        var $tHead = $("#xcTheadWrap-" + tableId).find(".tableTitle .text");

        $tHead.data("cols", numCols)
              .data("title", fullTableName);

        var tableName = xcHelper.getTableName(fullTableName);
        var nameHtml =
            '<input type="text" class="tableName" value="' + tableName + '" ' +
            ' autocorrect="off" spellcheck="false">' +
            '<span class="hashName">#' +
                tableId +
            '</span>';

        var numColHtml = '<span class="colNumBracket" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" ' +
                        'data-container="body" ' +
                        'title="' + CommonTxtTstr.NumCol + '">' +
                        ' [' + numCols + ']</span>';

        $tHead.html(nameHtml + numColHtml);
        var $tableName = $tHead.find('.tableName');
        updateTableNameWidth($tableName);
    }

    function updateTableNameWidth($tableName) {
        var width = getTextWidth($tableName, $tableName.val());
        $tableName.width(width + 1);
    }

    function addTableListeners(tableId) {
        var $xcTableWrap = $('#xcTableWrap-' + tableId);
        var oldId = gActiveTableId;
        $xcTableWrap.on("mousedown", ".lockedTableIcon", function() {
            // handlers fire in the order that it's bound in.
            // So we are going to handle this, which removes the background
            // And the handler below will move the focus onto this table
            var txId = $(this).data("txid");
            xcTooltip.refresh($(".lockedTableIcon .iconPart"), 100);
            QueryManager.cancelQuery(txId);
        });

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

        var $rowGrab = $('#xcTbodyWrap-' + tableId).find('.rowGrab.last');
        $rowGrab.mousedown(function(event) {
            if (event.which === 1) {
                TblAnim.startRowResize($(this), event);
            }
        });
    }

    function addRowListeners(newCells) {
        var $jsonEle = newCells.find('.jsonElement');
        $jsonEle.dblclick(showJSONMoal);
        $jsonEle.on("click", ".pop", showJSONMoal);

        newCells.find('.rowGrab').mousedown(function(event) {
            if (event.which === 1) {
                TblAnim.startRowResize($(this), event);
            }
        });

        newCells.find('.idSpan').click(function() {
            var tableId = xcHelper.parseTableId($(this).closest('table'));
            var rowNum = parseInt($(this).closest('tr').attr('class').substring(3));
            if (gTables[tableId].bookmarks.indexOf(rowNum) < 0) {
                TblManager.bookmarkRow(rowNum, tableId);
            } else {
                TblManager.unbookmarkRow(rowNum, tableId);
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

            var $target = $(event.target);
            var notDropDown = $target.closest('.dropdownBox').length === 0 &&
                                $target.closest(".dotWrap").length === 0;
            if ($table.find('.selectedCell').length === 0) {
                $('.selectedCell').removeClass('selectedCell');
                lastSelectedCell = $editableHead;
            }

            if (isSystemMac && event.metaKey ||
                !isSystemMac && event.ctrlKey) {
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

        $thead[0].oncontextmenu = function(event) {
            var $target = $(event.target).closest('.header');
            if ($target.length) {
                $target = $target.find('.dropdownBox');
                var click = $.Event("click");
                click.rightClick = true;
                click.pageX = event.pageX;
                $target.trigger(click);
                event.preventDefault();
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

        $thead.on("click", ".topHeader .dotWrap", function() {
            var $dotWrap = $(this);
            var $dot = $dotWrap.find(".dot");
            var $topHeader = $dotWrap.closest(".topHeader");
            var x = $dot[0].getBoundingClientRect().left;
            var y = $topHeader[0].getBoundingClientRect().bottom;
            var $menu = $("#prefixColorMenu");
            var prefix = $topHeader.find(".prefix").text();
            var color = $topHeader.data("color");

            xcHelper.dropdownOpen($dotWrap, $menu, {
                "mouseCoors": {"x": x + 1, "y": y},
                "floating"  : true,
                "prefix"    : prefix,
                "color"     : color
            });
        });

        $thead.on("click", ".dropdownBox", function(event) {
            if ($("#mainFrame").hasClass("modalOpen")) {
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

        $thead.on('mousedown', '.editableHead', function(event) {
            if (event.which !== 1) {
                return;
            }
            if ($(this).closest('.editable').length) {
                return;
            }
            if ($table.closest('.columnPicker').length ||
                ($("#mainFrame").hasClass("modalOpen") && !event.bypassModal)) {
                // not focus when in modal unless bypassModa is true
                return;
            }
            if (isSystemMac && event.ctrlKey) {
                return;
            }
            var headCol = $(this).closest('th');

            TblAnim.startColDrag(headCol, event);
        });

        $thead.on("keydown", ".editableHead", function(event) {
            var $input = $(event.target);
            if (event.which === keyCode.Enter && !$input.prop("disabled")) {
                var colName = $input.val().trim();
                var colNum = xcHelper.parseColNum($input);

                if (colName === "" ||
                    ColManager.checkColName($input, tableId, colNum))
                {
                    return false;
                } else {
                    StatusBox.forceHide(); // hide previous error mesage if any
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
                $("#mainFrame").hasClass("modalOpen"))
            {
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
                $("#mainFrame").hasClass("modalOpen"))
            {
                $el.trigger('click');
                // not focus when in modal
                return false;
            }
            var yCoor = Math.max(event.pageY, $div.offset().top +
                                 $div.height() - 10);
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
                "isDataTd"  : isDataTd,
                "floating"  : true
            });

            return false;
        };

        $thead.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });
    };

    // creates thead and cells but not the body of the table
    function generateTableShell(tableId) {
        var isTableInActiveWS = WSManager.isTableInActiveWS(tableId);
        var tableClasses = isTableInActiveWS ? "" : "inActive";
        var xcTableWrap =
            '<div id="xcTableWrap-' + tableId + '"' +
                ' class="xcTableWrap tableWrap ' + tableClasses + '" ' +
                'data-id="' + tableId + '">' +
                '<div id="xcTbodyWrap-' + tableId + '" class="xcTbodyWrap" ' +
                'data-id="' + tableId + '"></div>' +
            '</div>';
        // creates a new table, completed thead, and empty tbody
        var position = WSManager.getTablePosition(tableId);

        if (position === 0) {
            $('#mainFrame').prepend(xcTableWrap);
        } else {
            var $prevTable = $('.xcTableWrap:not(.tableToRemove)').eq(position - 1);
            if ($prevTable.length !== 0) {
                $prevTable.after(xcTableWrap);
            } else {
                $('#mainFrame').append(xcTableWrap);
            }
            // we exclude any tables pending removal because otherwise we wouldn't
            // be placing the new table is the proper position
        }

        var tableShell = TblManager.generateTheadTbody(tableId);
        var tableHtml =
            '<table id="xcTable-' + tableId + '" class="xcTable dataTable" ' +
            'style="width:0px;" data-id="' + tableId + '">' +
                tableShell +
            '</table>' +
            '<div class="rowGrab last"></div>';

        $('#xcTbodyWrap-' + tableId).append(tableHtml);
    }

    TblManager.generateTheadTbody = function(tableId) {
        var table = gTables[tableId];
        var newTableHtml =
            '<thead>' +
              '<tr>' +
                '<th style="width: 50px;" class="col0 th rowNumHead">' +
                  '<div class="header">' +
                    '<input value="" spellcheck="false" disabled title="' +
                    TooltipTStr.SelectAllColumns + '" ' +
                    'data-toggle="tooltip"' +
                    ' data-placement="top" data-container="body">' +
                  '</div>' +
                '</th>';

        var numCols = table.getNumCols();
        for (var colNum = 1; colNum <= numCols; colNum++) {
            var progCol = table.getCol(colNum);
            if (progCol.isDATACol()) {
                var width;
                var thClass = "";
                if (progCol.hasHidden()) {
                    width = gHiddenColumnWidth;
                    thClass = " userHidden";
                } else {
                    width = progCol.getWidth();
                }
                if (!progCol.hasHidden() && width === 'auto') {
                    width = 400;
                }
                newTableHtml += generateDataHeadHTML(colNum, thClass, width);
            } else {
                newTableHtml += TblManager.getColHeadHTML(colNum, tableId);
            }
        }

        newTableHtml += '</tr></thead><tbody></tbody>';

        return newTableHtml;
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
                '</div>' +
            '</th>';

        return (newTable);
    }

    function renameTableHelper($div) {
        var $tableName = $div.find(".tableName");
        var newName = $tableName.val().trim();
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
                "$ele": $tableName
            },
            {
                "$ele" : $tableName,
                "error": ErrTStr.NoSpecialChar,
                "check": function() {
                    return xcHelper.hasSpecialChar(newName);
                }
            },
            {
                "$ele" : $tableName,
                "error": ErrTStr.TooLong,
                "check": function() {
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
        var tableName = table.getName();

        // Free the result set pointer that is still pointing to it
        table.freeResultset()
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

    function delUndoneTableHelper(tableId) {
        var deferred = jQuery.Deferred();

        var table = gTables[tableId];
        var tableName = table.tableName;
        XcalarDeleteTable(tableName, null)
        .then(function() {
            var tableId = xcHelper.getTableId(tableName);
            if (tableId != null && gTables[tableId] != null) {
                WSManager.removeTable(tableId);
                delete gTables[tableId];
            }
            deferred.resolve();
        })
        .fail(function() {
            // remove the table from our records regardless
            // it will just go in the temp table list anyways
            var tableId = xcHelper.getTableId(tableName);
            if (tableId != null && gTables[tableId] != null) {
                WSManager.removeTable(tableId);
                delete gTables[tableId];
            }
            deferred.reject();
        });

        return (deferred.promise());
    }

    function autoSizeDataCol(tableId) {
        var progCols = gTables[tableId].tableCols;
        var numCols = progCols.length;
        var dataCol;
        var dataColIndex;
        for (var i = 0; i < numCols; i++) {
            if (progCols[i].isDATACol()) {
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
            } else {
                dataCol.width = minWidth;
            }
            var $th = $('#xcTable-' + tableId).find('th.col' + dataColIndex);
            autosizeCol($th, {
                "fitAll"  : true,
                "minWidth": minWidth,
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
