window.xcFunction = (function($, xcFunction) {
    var joinLookUp = {
        "Inner Join": JoinOperatorT.InnerJoin,
        "Left Outer Join": JoinOperatorT.LeftOuterJoin,
        "Right Outer Join": JoinOperatorT.RightOuterJoin,
        "Full Outer Join": JoinOperatorT.FullOuterJoin,
        "Left Semi Join": JoinCompoundOperatorTStr.LeftSemiJoin,
        "Right Semi Join": JoinCompoundOperatorTStr.RightSemiJoin,
        "Left Anti Semi Join": JoinCompoundOperatorTStr.LeftAntiSemiJoin,
        "Right Anti Semi Join": JoinCompoundOperatorTStr.RightAntiSemiJoin,
        "Cross Join": JoinCompoundOperatorTStr.CrossJoin,
    };

    // filter table column, returns resulting table name
    // fltOptions:
    //      filterString: eval string, required
    //      formOpenTime: number
    xcFunction.filter = function(colNum, tableId, fltOptions) {
        var deferred = jQuery.Deferred();

        var table = gTables[tableId];
        var tableName = table.getName();
        var frontColName = table.getCol(colNum).getFrontColName(true);
        var fltStr = fltOptions.filterString;
        var worksheet = WSManager.getWSFromTable(tableId);
        var formOpenTime;
        if (fltOptions && fltOptions.formOpenTime) {
            formOpenTime = fltOptions.formOpenTime;
            delete fltOptions.formOpenTime;
        }

        var sql = {
            "operation": SQLOps.Filter,
            "tableName": tableName,
            "tableId": tableId,
            "colName": frontColName,
            "colNum": colNum,
            "fltOptions": fltOptions,
            "formOpenTime": formOpenTime,
            "htmlExclude": ["formOpenTime"]
        };
        var txId = Transaction.start({
            "msg": StatusMessageTStr.Filter + ': ' + frontColName,
            "operation": SQLOps.Filter,
            "sql": sql,
            "steps": 1
        });

        var finalTableName;

        xcHelper.lockTable(tableId, txId);

        XIApi.filter(txId, fltStr, tableName)
        .then(function(tableAfterFilter) {
            finalTableName = tableAfterFilter;
            var options = {"selectCol": colNum};
            var oldTables = [];
            if (!fltOptions.complement) {
                oldTables.push(tableName);
            }
            return TblManager.refreshTable([finalTableName], table.tableCols,
                                            oldTables, worksheet, txId,
                                            options);
        })
        .then(function() {
            xcHelper.unlockTable(tableId);

            sql.newTableName = finalTableName;
            Transaction.done(txId, {
                "msgTable": xcHelper.getTableId(finalTableName),
                "sql": sql
            });
            deferred.resolve(finalTableName);
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId);

            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.FilterFailed,
                "error": error
            });

            deferred.reject(error);
        });

        return deferred.promise();
    };

    // aggregate table column
    // aggName is optional and can be left blank (will autogenerate)
    xcFunction.aggregate = function(colNum, tableId, aggrOp, aggStr, aggName) {
        var deferred = jQuery.Deferred();

        var hasAggName = (aggName && aggName[0] === gAggVarPrefix);
        var table = gTables[tableId];
        var tableName = table.getName();
        var frontColName;
        var backColName;
        if (colNum != null && colNum !== -1) {
            var progCol = table.getCol(colNum);
            frontColName = progCol.getFrontColName(true);
            backColName = progCol.getBackColName();
        } else {
            frontColName = aggStr;
            backColName = aggStr;
        }

        var title = xcHelper.replaceMsg(AggTStr.AggTitle, {"op": aggrOp});
        var instr = xcHelper.replaceMsg(AggTStr.AggInstr, {
            "col": frontColName,
            "op": aggrOp
        });

        if (hasAggName) {
            instr += xcHelper.replaceMsg(AggTStr.AggName, {
                "aggName": aggName
            });
        }

        var aggInfo = Aggregates.getAgg(tableId, backColName, aggrOp);
        if (aggInfo != null && !hasAggName) {
            var alertMsg = xcHelper.replaceMsg(AggTStr.AggMsg, {
                "val": xcHelper.numToStr(aggInfo.value)
            });
            Alert.show({
                "title": title,
                "instr": instr,
                "msg": alertMsg,
                "isAlert": true
            });

            deferred.resolve(aggInfo.value, aggInfo.dagName);

            return deferred.promise();
        }

        var sql = {
            "operation": SQLOps.Aggr,
            "tableName": tableName,
            "tableId": tableId,
            "colName": frontColName,
            "colNum": colNum,
            "aggrOp": aggrOp,
            "aggStr": aggStr,
            "aggName": aggName,
            "htmlExclude": ["aggStr"]
        };
        var msg = StatusMessageTStr.Aggregate + " " + aggrOp + " " +
                  StatusMessageTStr.OnColumn + ": " + frontColName;
        var txId = Transaction.start({
            "msg": msg,
            "operation": SQLOps.Aggr,
            "sql": sql,
            "steps": 1
        });

        xcHelper.lockTable(tableId, txId);

        // backend doesn't take gAggVarPrefix so we will add it back alter
        var hasPrefix = false;
        if (hasAggName) {
            aggName = aggName.slice(1);
            hasPrefix = true;
        }

        XIApi.aggregate(txId, aggrOp, aggStr, tableName, aggName)
        .then(function(value, dstDagName, toDelete) {
            var origAggName = aggName;
            // add back prefix for front end
            if (hasPrefix) {
                origAggName = gAggVarPrefix + aggName;
            }
            var aggRes = {
                "value": value,
                "dagName": dstDagName,
                "aggName": origAggName,
                "tableId": tableId,
                "backColName": backColName,
                "op": aggrOp
            };

            if (toDelete) {
                // and to UI cache only
                Aggregates.addAgg(aggRes, true);
            } else {
                Aggregates.addAgg(aggRes);
                TableList.refreshConstantList();
            }

            Transaction.done(txId, {"msgTable": tableId});
            // show result in alert modal
            var alertMsg = xcHelper.replaceMsg(AggTStr.AggMsg, {
                "val": xcHelper.numToStr(value)
            });

            Alert.show({
                "title": title,
                "instr": instr,
                "msg": alertMsg,
                "isAlert": true
            });


            deferred.resolve(value, dstDagName);
        })
        .fail(function(error) {
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.AggregateFailed,
                "error": error
            });

            deferred.reject(error);
        })
        .always(function() {
            xcHelper.unlockTable(tableId);
        });

        return deferred.promise();
    };

    // sort table column
    // options:
    //      formOpenTime: number
    xcFunction.sort = function(tableId, colInfo, options) {
        var deferred = jQuery.Deferred();
        options = options || {};
        var table = gTables[tableId];
        var tableName = table.getName();
        var tableCols = table.tableCols;
        var keys = [];
        var colNums = [];
        var orders = [];

        for (var i = 0; i < colInfo.length; i++) {
            var progCol = table.getCol(colInfo[i].colNum);

            keys.push(progCol.getFrontColName(true));
            colNums.push(colInfo[i].colNum);
            orders.push(colInfo[i].order);
        }

        // XXX fix this
        var direction = (orders[0] === XcalarOrderingT.XcalarOrderingAscending) ? "ASC" : "DESC";


        var worksheet = WSManager.getWSFromTable(tableId);
        var sql = {
            "operation": SQLOps.Sort,
            "tableName": tableName,
            "tableId": tableId,
            "keys": keys,
            "colNums": colNums,
            "orders": orders,
            "direction": direction,
            "sorted": true,
            "options": options,
            "colInfo": colInfo,
            "htmlExclude": ["options", "colInfo"]
        };
        // var steps = typeToCast ? 2 : 1;
        var steps = -1;
        var msg;
        if (colInfo.length > 1) {
            msg = StatusMessageTStr.Sort + " multiple columns";
        } else {
            msg = StatusMessageTStr.Sort + " " + keys[0];
        }
        var txId = Transaction.start({
            "msg": msg,
            "operation": SQLOps.Sort,
            "sql": sql,
            "steps": steps
        });

        // user timeout because it may fail soon if table is already sorted
        // lock table will cause blinking
        var timer = setTimeout(function() {
            xcHelper.lockTable(tableId, txId);
        }, 200);

        var finalTableName;
        var finalTableCols;

        typeCastHelper()
        .then(function(tableToSort, colToSort, newTableCols) {
            finalTableCols = newTableCols;
            if (colInfo.length === 1) {
                return XIApi.sort(txId, colInfo[0].order, colToSort, tableToSort);
            } else {
                //return XIApi.sort(txId, colInfo[0].order, colToSort, tableToSort);
                return XIApi.multiSort(txId, colInfo, tableName);
            }
        })
        .then(function(sortTableName) {
            if (typeof(sortTableName) !== "string") {
                // For multiSort, it returns a struct with the name of the sort
                // col as well
                sortTableName = sortTableName.newTableName;
            }
            finalTableName = sortTableName;
            var options = {"selectCol": colNums};
            // sort will filter out KNF, so it change the profile
            return TblManager.refreshTable([finalTableName], finalTableCols,
                                            [tableName], worksheet, txId,
                                            options);
        })
        .then(function() {
            clearTimeout(timer);
            if (table.hasLock()) {
                xcHelper.unlockTable(tableId);
            }

            sql.newTableName = finalTableName;
            Transaction.done(txId, {
                "msgTable": xcHelper.getTableId(finalTableName),
                "sql": sql
            });
            deferred.resolve(finalTableName);
        })
        .fail(function(error, sorted) {
            clearTimeout(timer);
            if (table.hasLock()) {
                xcHelper.unlockTable(tableId);
            }

            if (sorted) {
                Transaction.cancel(txId);

                var mgs = xcHelper.replaceMsg(IndexTStr.SortedErr, {
                    "order": XcalarOrderingTStr[orders[0]].toLowerCase() // XXX fix this
                });
                Alert.error(IndexTStr.Sorted, mgs);
            } else if (error.error === SQLType.Cancel) {
                Transaction.cancel(txId);
                deferred.resolve();
            } else {
                Transaction.fail(txId, {
                    "failMsg": StatusMessageTStr.SortFailed,
                    "error": error
                });
            }
            deferred.reject(error);
        });

        return deferred.promise();

        function typeCastHelper() {
            var typeToCast = colInfo[0].typeToCast;
            var progCol = table.getCol(colNums[0]);
            var backColName = progCol.getBackColName();
            if (colInfo.length > 1) {
                return PromiseHelper.resolve(tableName, colInfo, tableCols);
            } else if (typeToCast == null) {
                return PromiseHelper.resolve(tableName, backColName, tableCols);
            }

            sql.typeToCast = typeToCast;

            var innerDeferred = jQuery.Deferred();
            var mapString = xcHelper.castStrHelper(backColName, typeToCast);
            var mapColName = xcHelper.stripColName(backColName) + "_" + typeToCast;

            mapColName = xcHelper.getUniqColName(tableId, mapColName);

            XIApi.map(txId, mapString, tableName, mapColName)
            .then(function(mapTableName) {
                var mapOptions = {
                    "replaceColumn": true,
                    "resize": true
                };
                var mapTablCols = xcHelper.mapColGenerate(colNums[0], mapColName,
                                        mapString, tableCols, mapOptions);
                innerDeferred.resolve(mapTableName, mapColName, mapTablCols);
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }
    };

    // join two tables
    // joinInfo: object with the following attrs:
            // colNums: array of column numbers to join on,
            // casts: array of cast types ["string", "boolean", null] etc
            // pulledColumns: columns to pulled out (front col name)
            // tableName: table's name
            // reaname: array of rename object, can be null or empty array

    // options:
    //          keepTables: boolean, if true will keep src tables in worksheet
    //          formOpenTime: int, used when undoing
    xcFunction.join = function(joinStr, lJoinInfo, rJoinInfo, newTableName,
                               options)
    {
        var deferred = jQuery.Deferred();
        var joinType = joinLookUp[joinStr];
        newTableName = newTableName + Authentication.getHashId();

        lJoinInfo = lJoinInfo || {};
        rJoinInfo = rJoinInfo || {};
        options = options || {};

        var lTableId = lJoinInfo.tableId;
        var lColNums = lJoinInfo.colNums;
        var lTable = gTables[lTableId];
        var lTableName = lTable.getName();
        lJoinInfo.tablePos = WSManager.getTableRelativePosition(lTableId);
        lJoinInfo.ws = WSManager.getWSFromTable(lTableId);

        var rTableId = rJoinInfo.tableId;
        var rColNums = rJoinInfo.colNums;
        var rTable = gTables[rTableId];
        var rTableName = rTable.getName();
        rJoinInfo.tablePos = WSManager.getTableRelativePosition(rTableId);
        rJoinInfo.ws = WSManager.getWSFromTable(rTableId);

        var lColNames = lColNums.map(function(colNum) {
            return lTable.getCol(colNum).getBackColName();
        });

        var rColNames = rColNums.map(function(colNum) {
            return rTable.getCol(colNum).getBackColName();
        });

        // joined table will in the current active worksheet.
        var worksheet = WSManager.getActiveWS();
        var newTableId = xcHelper.getTableId(newTableName);

        var sql = {
            "operation": SQLOps.Join,
            "lTableName": lTableName,
            "lColNums": lColNums,
            "lJoinInfo": lJoinInfo,
            "rTableName": rTableName,
            "rColNums": rColNums,
            "rJoinInfo": rJoinInfo,
            "newTableName": newTableName,
            "joinStr": joinStr,
            "worksheet": worksheet,
            "options": options,
            "htmlExclude": ["lJoinInfo", "rJoinInfo", "worksheet",
                             "options"]
        };

        // regular join on unsorted cols = 3, 1 if sorted (through groupby)
        // left table index (optional), right table index (optional), join

        // multi join on unsorted cols = 5, 3 if sorted
        // concat left, concat right, index left, index right, join
        var steps;
        if (lColNums.length > 1) {
            steps = 5;
        } else {
            steps = 3;
        }

        var txId = Transaction.start({
            "msg": StatusMessageTStr.Join,
            "operation": SQLOps.Join,
            "sql": sql,
            "steps": steps
        });

        xcHelper.lockTable(lTableId, txId);
        xcHelper.lockTable(rTableId, txId);

        var focusOnTable = false;
        var scrollChecker = new ScollTableChecker();

        var lTableInfo = {
            "tableName": lTableName,
            "columns": lColNames,
            "casts": lJoinInfo.casts,
            "pulledColumns": lJoinInfo.pulledColumns,
            "rename": lJoinInfo.rename
        };

        var rTableInfo = {
            "tableName": rTableName,
            "columns": rColNames,
            "casts": rJoinInfo.casts,
            "pulledColumns": rJoinInfo.pulledColumns,
            "rename": rJoinInfo.rename
        };

        var finalJoinTableName;
        var joinOpts = {
            "newTableName": newTableName
        };

        XIApi.join(txId, joinType, lTableInfo, rTableInfo, joinOpts)
        .then(function(finalTableName, finalTableCols) {
            finalJoinTableName = finalTableName;
            var tablesToReplace = [];
            var refreshOptions = {};
            if (!options.keepTables) {
                tablesToReplace = [lTableName, rTableName];
            } else {
                focusOnTable = scrollChecker.checkScroll();
                refreshOptions = {"focusWorkspace": focusOnTable};
            }
            return TblManager.refreshTable([finalTableName], finalTableCols,
                                        tablesToReplace, worksheet, txId,
                                        refreshOptions);
        })
        .then(function() {
            Transaction.done(txId, {
                "msgTable": newTableId,
                "noNotification": focusOnTable
            });
            deferred.resolve(finalJoinTableName);
        })
        .fail(function(error) {
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.JoinFailed,
                "error": error
            });
            deferred.reject(error);
        })
        .always(function() {
            xcHelper.unlockTable(lTableId);
            xcHelper.unlockTable(rTableId);
        });

        return deferred.promise();
    };

    // gbArgs is array of {operator:str, aggCol:str, newColName:str,
    //                     cast:null or str} objects
    // options:  isIncSample: boolean, isJoin: boolean, icvMode: boolean,
    //           formOpenTime: int, columnsToKeep: array of colnums, casts
    xcFunction.groupBy = function(tableId, gbArgs, groupByCols, options) {
        // Validation
        if (tableId == null ||
            groupByCols.length < 1 ||
            gbArgs.length < 1 ||
            gbArgs[0].aggColName.length < 1)
        {
            return PromiseHelper.reject("Invalid Parameters!");
        }

        options = options || {};

        var deferred = jQuery.Deferred();
        var isIncSample = options.isIncSample || false;
        var isJoin = options.isJoin || false;
        var table = gTables[tableId];

        var tableName = table.getName();

        var finalTableName;
        var finalTableCols;

        // current workshhet index
        var curWS = WSManager.getWSFromTable(tableId);
        var steps;
        // XXX figure out num steps with multiple group bys
        if (groupByCols.length > 1) {
            // concat, index(optional), groupby, [cuts]
            steps = 3 + groupByCols.length;
        } else {
            // index(optional), groupby
            steps = 2;
        }
        if (isJoin) {
            if (groupByCols.length > 1) {
                // concat L, concat R, index L,  index R, join
                steps += 5;
            } else { // one groupByCol, indexed groupby table will exists already
                // index, join
                steps += 2;
            }
        }
        if (gbArgs.length > 1) {
            steps = -1;
        }

        var sql = {
            "operation": SQLOps.GroupBy,
            "args": gbArgs,
            "tableName": tableName,
            "tableId": tableId,
            "groupByCols": groupByCols,
            "options": options,
            "htmlExclude": ["options"]
        };

        var txId = Transaction.start({
            "msg": StatusMessageTStr.GroupBy,
            "operation": SQLOps.GroupBy,
            "steps": steps,
            "sql": sql
        });

        xcHelper.lockTable(tableId, txId);

        var focusOnTable = false;
        var scrollChecker = new ScollTableChecker();

        var dstTableName = options.dstTableName || null;

        if (dstTableName != null) {
            dstTableName += Authentication.getHashId();
        }
        var groupByOpts = {
            "newTableName": dstTableName,
            "isIncSample": isIncSample,
            "sampleCols": options.columnsToKeep,
            "icvMode": options.icvMode
        };

        // do not pass in the cast property
        var groupByArgs = [];
        gbArgs.forEach(function(gbArg) {
            groupByArgs.push({
                operator: gbArg.operator,
                aggColName: gbArg.aggColName,
                newColName: gbArg.newColName
            });
        });

        var castPromise;
        if (groupByArgs.length === 1 && gbArgs[0].cast) {
            groupByArgs[0].aggColName = xcHelper.castStrHelper(
                                        gbArgs[0].aggColName, gbArgs[0].cast);
            castPromise = PromiseHelper.resolve(tableName);
        } else {
            castPromise = castCols();
        }

        castPromise
        .then(function(castTableName) {
            return XIApi.groupBy(txId, groupByArgs, groupByCols, castTableName,
                                 groupByOpts);
        })
        .then(function(nTableName, nTableCols, renamedGBCols) {
            if (isJoin) {
                var dataColNum = table.getColNumByBackName("DATA");
                return groupByJoinHelper(nTableName, nTableCols, dataColNum,
                                         isIncSample, renamedGBCols);
            } else {
                return PromiseHelper.resolve(nTableName, nTableCols);
            }
        })
        .then(function(nTableName, nTableCols) {
            finalTableCols = nTableCols;
            finalTableName = nTableName;

            focusOnTable = scrollChecker.checkScroll();
            var tableOptions = {"focusWorkspace": focusOnTable};
            var tablesToReplace = null;

            if (isJoin) {
                var colsToSelect = [];
                for (var i = 0; i < gbArgs.length; i++) {
                    colsToSelect.push(i + 1);
                }
                tableOptions.selectCol = colsToSelect;
                tablesToReplace = [tableName];
            }

            return TblManager.refreshTable([finalTableName], finalTableCols,
                                            tablesToReplace, curWS, txId,
                                            tableOptions);
        })
        .then(function() {
            xcHelper.unlockTable(tableId);
            sql.newTableName = finalTableName;

            Transaction.done(txId, {
                "msgTable": xcHelper.getTableId(finalTableName),
                "sql": sql,
                "noNotification": focusOnTable
            });

            deferred.resolve(finalTableName);
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId);

            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.GroupByFailed,
                "error": error,
                "sql": sql
            });

            deferred.reject(error);
        });

        // cast before doing the group by
        function castCols() {
            var takenNames = {};
            groupByArgs.forEach(function(gbArg) {
                takenNames[gbArg.newColName] = true;
            });
            var mapStrs = [];
            var newCastNames = [];
            var castTableCols = table.tableCols;
            for (var i = 0; i < groupByArgs.length; i++) {
                if (gbArgs[i].cast) {
                    var parsedName = xcHelper.parsePrefixColName(
                                                groupByArgs[i].aggColName).name;
                    parsedName = xcHelper.stripColName(parsedName);
                    var newCastName = xcHelper.getUniqColName(tableId,
                                                parsedName, false, takenNames);
                    takenNames[newCastName] = true;
                    var mapStr = xcHelper.castStrHelper(gbArgs[i].aggColName,
                                                        gbArgs[i].cast);
                    mapStrs.push(mapStr);
                    newCastNames.push(newCastName);
                    var colNum = table.getColNumByBackName(
                                        groupByArgs[i].aggColName);
                    var mapOptions = {
                        "replaceColumn": true,
                        "resize": true,
                        "type": gbArgs[i].cast
                    };
                    castTableCols = xcHelper.mapColGenerate(colNum, newCastName,
                                            mapStr, castTableCols, mapOptions);
                    groupByArgs[i].aggColName = newCastName;
                }
            }
            if (mapStrs.length) {
                var innerDeferred = jQuery.Deferred();
                XIApi.map(txId, mapStrs, tableName, newCastNames)
                .then(function(castTableName) {
                    TblManager.setOrphanTableMeta(castTableName, castTableCols);
                    innerDeferred.resolve(castTableName);
                })
                .fail(function() {
                    innerDeferred.reject(tableName);
                });
                return innerDeferred.promise();
            } else {
                return PromiseHelper.resolve(tableName);
            }
        }

        // TODO when multi-groupby we can use the unsplit table instead of
        // splitting and then concatting again
        function groupByJoinHelper(nTable, nCols, dataColNum, isIncSample,
                                    renamedGBCols) {

            var innerDeferred = jQuery.Deferred();

            var joinType = JoinOperatorT.FullOuterJoin;
            var jonTable = xcHelper.getTableName(nTable) +
                            Authentication.getHashId();
            var lTable = gTables[tableId];
            var lTName = gTables[tableId].getName();

            var rTName = nTable;
            var lCols = groupByCols;
            var rRename = [];

            var rCols = renamedGBCols.map(function(colName) {
                colName = xcHelper.stripColName(colName);
                var parse = xcHelper.parsePrefixColName(colName);
                var hasNameConflict;

                if (isIncSample) {
                    // XXX Cheng: now we don't support join back with incSample
                    // once support, need to verify if it works
                    hasNameConflict = lTable.hasCol(parse.name, parse.prefix);
                } else {
                    colName = parse.name;
                    hasNameConflict = lTable.hasCol(parse.name, "");
                }

                if (hasNameConflict) {
                    // when has immediates conflict
                    console.info("Has immediates conflict, auto resolved");

                    var newName = xcHelper.randName(parse.name + "_GB", 3);
                    renameMap = xcHelper.getJoinRenameMap(colName, newName);
                    rRename.push(renameMap);
                }

                return colName;
            });

            // need to store previous table meta in case of new col names
            TblManager.setOrphanTableMeta(nTable, nCols);

            var lTableInfo = {
                "tableName": lTName,
                "columns": lCols
            };

            var rTableInfo = {
                "tableName": rTName,
                "columns": rCols,
                "rename": rRename
            };

            var joinOpts = {
                "newTableName": jonTable
            };

            XIApi.join(txId, joinType, lTableInfo, rTableInfo, joinOpts)
            .then(function(jonTable, joinTableCols) {
                // remove the duplicated columns that were joined
                joinTableCols.splice(joinTableCols.length -
                                    (nCols.length), nCols.length - 1);
                // put datacol back to where it was
                joinTableCols.splice(dataColNum - 1, 0,
                        joinTableCols.splice(joinTableCols.length - 1, 1)[0]);
                // put the groupBy column in front
                for (var i = 0; i < gbArgs.length; i++) {
                    joinTableCols.unshift(nCols[i]);
                }

                innerDeferred.resolve(jonTable, joinTableCols);
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        return deferred.promise();
    };

    // map a column
    // mapOptions: replaceColumn - boolean, if true, will replace an existing
    //                             column rather than create a new one
    //             formOpenTime  - int, if map is triggered from form, this
    //                              is a timestamp for when the form opened,
    //                              used for undo
    xcFunction.map = function(colNum, tableId, fieldName, mapString, mapOptions,
                              icvMode) {
        var deferred = jQuery.Deferred();

        mapOptions = mapOptions || {};

        var table = gTables[tableId];
        var tableName = table.getName();

        var worksheet = WSManager.getWSFromTable(tableId);
        var sql = {
            "operation": SQLOps.Map,
            "tableName": tableName,
            "tableId": tableId,
            "colNum": colNum,
            "fieldName": fieldName,
            "mapString": mapString,
            "mapOptions": mapOptions,
            "htmlExclude": ["mapOptions"]
        };
        var txId = Transaction.start({
            "msg": StatusMessageTStr.Map + " " + fieldName,
            "operation": SQLOps.Map,
            "sql": sql,
            "steps": 1
        });
        var finalTableName;
        var finalTableId;

        xcHelper.lockTable(tableId, txId);

        XIApi.map(txId, mapString, tableName, fieldName, undefined, icvMode)
        .then(function(tableAfterMap) {
            finalTableName = tableAfterMap;
            finalTableId = xcHelper.getTableId(finalTableName);

            var tablCols = xcHelper.mapColGenerate(colNum, fieldName, mapString,
                                                    table.tableCols, mapOptions);

            // map do not change groupby stats of the table
            Profile.copy(tableId, finalTableId);
            var options = {"selectCol": colNum};
            return TblManager.refreshTable([finalTableName], tablCols,
                                           [tableName], worksheet, txId,
                                           options);
        })
        .then(function() {
            xcHelper.unlockTable(tableId);

            sql.newTableName = finalTableName;
            Transaction.done(txId, {
                "msgTable": finalTableId,
                "sql": sql
            });

            deferred.resolve(finalTableName);
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId);

            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.MapFailed,
                "error": error
            });

            deferred.reject(error);
        });

        return deferred.promise();
    };

    // export table
    // backColumns and frontColumns are arrays of column names
    xcFunction.exportTable = function(tableName, exportName, targetName,
                                      numCols, backColumns, frontColumns,
                                      keepOrder, dontShowModal, options) {

        var deferred = jQuery.Deferred();
        var retName  = $(".retTitle:disabled").val();

        if (!retName || retName === "") {
            retName = "testing";
        }
        options = options || {};
        // XXX GUI-5271
        options.handleName = tableName.split("#")[0] +
                             Authentication.getHashId();
        // now disable retName
        // var fileName = retName + ".csv";
        // var location = hostname + ":/var/tmp/xcalar/" + exportName;

        var sql = {
            "operation": SQLOps.ExportTable,
            "tableName": tableName,
            "exportName": exportName,
            "targetName": targetName,
            "numCols": numCols,
            "frontColumns": frontColumns,
            "backColumns": backColumns,
            "keepOrder": keepOrder || false,
            "options": options,
            "htmlExclude": ['options']
        };
        var txId = Transaction.start({
            "msg": StatusMessageTStr.ExportTable + ": " + tableName,
            "operation": SQLOps.ExportTable,
            "sql": sql,
            "steps": 1, // xx is it possible to be multiple steps?
            // "exportName": options.handleName
        });

        XIApi.export(txId, tableName, exportName, targetName, numCols,
                    backColumns, frontColumns, keepOrder, options)
        .then(function(retStruct) {
            // XXX retStruct is unused. retStruct.timeTaken contains how long
            // the operation took to run
            var instr = xcHelper.replaceMsg(ExportTStr.SuccessInstr, {
                "table": tableName,
                "location": targetName,
                "file": exportName
            });

            var msg = '<div class="exportInfo">' +
                      '<div class="row">' +
                        '<span class="label">' + ExportTStr.FolderName +
                        ': </span>' +
                        '<span class="field">' + exportName + '</span>' +
                      '</div>' +
                      '<div class="row">' +
                        '<span class="label">' + ExportTStr.TargetName +
                        ': </span>' +
                        '<span class="field">' + targetName + '</span>' +
                      '</div>' +
                      '</div>';

            if (!dontShowModal) {
                Alert.show({
                    "title": ExportTStr.Success,
                    "msgTemplate": msg,
                    "instr": instr,
                    "isAlert": true,
                    "isCheckBox": true
                });
            }
            Transaction.done(txId, {
                "msgTable": xcHelper.getTableId(tableName)
            });

            deferred.resolve();
        })
        .fail(function(error) {
            var noAlert;
            // if error is that export name already in use and modal is still
            // visible, then show a statusbox next to the name field
            if (error && error.status != null &&
                (error.status === StatusT.StatusDsODBCTableExists ||
                error.status === StatusT.StatusExist ||
                error.status === StatusT.StatusExportSFFileExists) &&
                $('#exportName:visible').length !== 0) {
                StatusBox.show(ErrTStr.NameInUse, $('#exportName'), true);
                noAlert = true;
            } else {
                noAlert = false;
            }

            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.ExportFailed,
                "error": error,
                "noAlert": noAlert
            });

            deferred.reject(error);
        });

        return deferred.promise();
    };

    xcFunction.rename = function(tableId, newTableName) {
        var deferred = jQuery.Deferred();

        if (tableId == null || newTableName == null) {
            deferred.reject("Invalid renaming parameters");
            return (deferred.promise());
        }

        var table = gTables[tableId];
        var oldTableName = table.tableName;

        var sql = {
            "operation": SQLOps.RenameTable,
            "tableId": tableId,
            "oldTableName": oldTableName,
            "newTableName": newTableName
        };
        var txId = Transaction.start({
            "operation": SQLOps.RenameTable,
            "sql": sql,
            "steps": 1
        });

        // not lock table is the operation is short
        var lockTimer = setTimeout(function() {
            xcHelper.lockTable(tableId, txId);
        }, 500);

        var newTableNameId = xcHelper.getTableId(newTableName);
        if (newTableNameId !== tableId) {
            console.warn("Table Id not consistent");
            newTableName = xcHelper.getTableName(newTableName) + "#" + tableId;
        }

        XcalarRenameTable(oldTableName, newTableName, txId)
        .then(function() {
            // does renames for gTables, tabelist, dag
            table.tableName = newTableName;

            Dag.renameAllOccurrences(oldTableName, newTableName);
            TblManager.updateHeaderAndListInfo(tableId);

            Transaction.done(txId);
            deferred.resolve(newTableName);
        })
        .fail(function(error) {
            console.error("Rename Fails!". error);

            Transaction.fail(txId, {
                // "noAlert": noAlert,
                "error": error
            });
            deferred.reject(error);
        })
        .always(function() {
            clearTimeout(lockTimer);
            xcHelper.unlockTable(tableId);
        });

        return deferred.promise();
    };

    xcFunction.project = function(colNames, tableId, options) {
        var deferred = jQuery.Deferred();

        options = options || {};
        var tableName = gTables[tableId].getName();
        var worksheet = WSManager.getWSFromTable(tableId);

        var startTime = Date.now();
        var focusOnTable = false;
        var startScrollPosition = $('#mainFrame').scrollLeft();

        var allColNames = []; // array used to distinguish between columns found
        // or not found pulled out in the table
        for (var i = 0; i < colNames.length; i++) {
            allColNames.push({name: colNames[i], found: false});
        }

        var txId = Transaction.start({
            "msg": StatusMessageTStr.Project,
            "operation": SQLOps.Project,
            "steps": 1
        });

        xcHelper.lockTable(tableId, txId);

        var dstTableName;
        XIApi.project(txId, colNames, tableName)
        .then(function(newTableName) {
            dstTableName = newTableName;
            var timeAllowed = 1000;
            var endTime = Date.now();
            var elapsedTime = endTime - startTime;
            var timeSinceLastClick = endTime -
                                     gMouseEvents.getLastMouseDownTime();
            // we'll focus on table if its been less than timeAllowed OR
            // if the user hasn't clicked or scrolled
            if (elapsedTime < timeAllowed ||
                (timeSinceLastClick >= elapsedTime &&
                    ($('#mainFrame').scrollLeft() === startScrollPosition))) {
                focusOnTable = true;
            }
            var options = {"focusWorkspace": focusOnTable};


            var tableCols = xcHelper.deepCopy(gTables[tableId].tableCols);
            var finalTableCols = [];
            var colNameIndex;
            for (var i = 0; i < tableCols.length; i++) {
                colNameIndex = colNames.indexOf(tableCols[i].backName);
                if (colNameIndex > -1) {
                    finalTableCols.push(tableCols[i]);
                } else if (tableCols[i].backName === "DATA") {
                    finalTableCols.push(ColManager.newDATACol());
                }
            }

            return TblManager.refreshTable([dstTableName], finalTableCols,
                                           [tableName], worksheet, txId,
                                           options);
        })
        .then(function() {
            xcHelper.unlockTable(tableId);
            var sql = {
                "operation": SQLOps.Project,
                "tableName": tableName,
                "tableId": tableId,
                "colNames": colNames,
                "newTableName": dstTableName
            };

            var finalTableId = xcHelper.getTableId(dstTableName);

            Transaction.done(txId, {
                "msgTable": finalTableId,
                "sql": sql,
                "noNotification": focusOnTable
            });
            deferred.resolve(dstTableName);
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId);
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.ProjectFailed,
                "error": error
            });
            deferred.reject();
        });

        return deferred.promise();
    };

    return (xcFunction);
}(jQuery, {}));
