window.UExtXcalarDef = (function(UExtXcalarDef) {
    UExtXcalarDef.buttons = [{
        "buttonText"   : "Horizontal Partition",
        "fnName"       : "hPartition",
        "arrayOfFields": [{
            "type"      : "column",
            "name"      : "Partition On",
            "fieldClass": "partitionCol",
            "autofill"  : true,
            "typeCheck" : {
                "columnType": ["number", "string"]
            }
        },
        {
            "type"      : "number",
            "name"      : "No. of Partitions",
            "fieldClass": "partitionNums",
            "typeCheck" : {
                "integer": true,
                "min"    : 1,
                "max"    : 10
            }
        }]
    },
    {
        "buttonText"   : "Windowing",
        "fnName"       : "windowChain",
        "arrayOfFields": [{
            "type"      : "column",
            "name"      : "Window On",
            "fieldClass": "winCols",
            "autofill"  : true,
            "typeCheck" : {
                "multiColumn": true,
                "columnType": ["number", "string"]
            }
        },
        {
            "type"      : "column",
            "name"      : "Sort On",
            "fieldClass": "sortCol",
            "typeCheck" : {
                "columnType": ["string", "number"]
            }
        },
        {
            "type"      : "string",
            "name"      : "Sort Order",
            "autofill"  : "ascending",
            "enums"     : ["ascending", "descending"],
            "fieldClass": "order"
        },
        {
            "type"      : "number",
            "name"      : "Lag",
            "fieldClass": "lag",
            "typeCheck" : {
                "integer": true,
                "min"    : 0
            }
        },
        {
            "type"      : "number",
            "name"      : "Lead",
            "fieldClass": "lead",
            "typeCheck" : {
                "integer": true,
                "min"    : 0
            }
        }]
    }];

    UExtXcalarDef.actionFn = function(functionName) {
        switch (functionName) {
            case ("hPartition"):
                return hPartitionExt();
            case ("windowChain"):
                return windowExt();
            default:
                return null;
        }
    };

    function hPartitionExt() {
        var ext = new XcSDK.Extension();

        ext.start = function() {
            var self = this;
            var deferred = XcSDK.Promise.deferred();

            getUniqueValues(self)
            .then(function(uniqueVals) {
                var len = uniqueVals.length;
                var promises = [];

                // XXX can this part be simplified to not use bind???
                for (var i = 0; i < len; i++) {
                    promises.push(hPartition.bind(window, self, uniqueVals[i], i));
                }

                return XcSDK.Promise.chain(promises);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }

    function windowExt() {
        var ext = new XcSDK.Extension();

        ext.beforeStart = function() {
            var self = this;
            var args = self.getArgs();

            if (args.order.startsWith("desc")) {
                args.order = XcSDK.Enums.SortType.Desc;
            } else if (args.order.startsWith("asc")) {
                args.order = XcSDK.Enums.SortType.Asc;
            } else {
                return XcSDK.Promise.reject("Sort Order Field can only be ascending or descending");
            }

            if (args.lag === 0 && args.lead === 0) {
                return XcSDK.Promise.reject("Lag and Lead cannot all be zeros");
            }

            var avoidCollision = false;
            var fieldAttrs = ext.getTriggerTable().getImmediatesMeta();
            if (fieldAttrs != null) {
                var numFields = fieldAttrs.length;
                for (var i = 0; i < numFields; i++) {
                    var immediateName = fieldAttrs[i].name;
                    if (immediateName.includes("_lag_") ||
                        immediateName.includes("_lead_"))
                    {
                        avoidCollision = true;
                        break;
                    }
                }
            }
            // set some useful attribute
            self.setAttribute("avoidCollision", avoidCollision);

            self.setAttribute("randNumber", Math.floor(Math.random() * 100));
            // constant to mark it's a lag table, lead table, or current table
            self.setAttribute("winState", {
                "lag" : "lag",
                "lead": "lead",
            });

            // cache tableNames for lag, lead and cur table
            self.setAttribute("tableNames", {
                "lag" : [],
                "lead": [],
            });

            // cache winCols for lag and lead
            self.setAttribute("winColFinal", {
                "lag" : [],
                "lead": [],
                "cur" : [],
            });

            // renameMap for appending _lag and _lead to orig colNames
            self.setAttribute("renameMap", []);

            // cache names of rowNum col in lag, lead and cur table
            self.setAttribute("rowNumColNames", {
                "lag" : [],
                "lead": [],
            });
        };

        ext.start = function() {
            var deferred = XcSDK.Promise.deferred();
            var self = this;
            var args = self.getArgs();
            var sortCol = args.sortCol;
            var winCols = args.winCols;
            var direction = args.order;
            var lag = args.lag;
            var lead = args.lead;
            var srcTable = ext.getTriggerTable().getName();
            var rowNumTable;
            var rowNumCol;

            var winState = self.getAttribute("winState");
            var renameMap = self.getAttribute("renameMap");
            var winColFinal = self.getAttribute("winColFinal");
            var finalTableName;

            // Step 1: sort table
            winSortTable(self, sortCol, direction)
            .then(function(tableAfterSort) {
                // Step 2: Get Row Num Column, on SORTED table and index on it.
                return winGenRowNum(self, tableAfterSort);
            })
            .then(function(tableWithRowNum, rowNumColTmp) {
                // Step 3: Project the columns we want to window on. Converts
                // fatptr columns to immediates
                rowNumCol = rowNumColTmp;
                rowNumTable = tableWithRowNum;
                return winProject(self, tableWithRowNum);
            })
            .then(function(tableAfterProject) {
                // Step 4: Generate the columns for lag and lead.
                var defChain = [];
                var i;
                for (i = 0; i < lag; i++) {
                    defChain.push(windLagLeadMap.bind(this, self, winState.lag, i,
                                                 tableAfterProject, rowNumCol));
                }
                for (i = 0; i < lead; i++) {
                    defChain.push(windLagLeadMap.bind(this, self, winState.lead, i,
                                                 tableAfterProject, rowNumCol));
                }

                return XcSDK.Promise.chain(defChain);
            })
            .then(function() {
                // Step 5: inner join funnesss!
                // Order: Take cur, join lags then join leads
                var defChain = [];

                var tableNames = self.getAttribute("tableNames");
                var rowNumColNames = self.getAttribute("rowNumColNames");
                var joinType = XcSDK.Enums.JoinType.InnerJoin;

                var lTable = rowNumTable;
                var lCol = rowNumCol;
                var rTable;
                var rCol;
                var newTableName, newColName, col;
                var i, j;

                for (i = 0; i < lag; i++) {
                    var renameMapTmp = [];
                    for (j = 0; j < renameMap.length; j++) {
                        newColName = renameMap[j].orig + "_lag_" + (i + 1);
                        renameMapTmp.push(
                            xcHelper.getJoinRenameMap(renameMap[j].orig,
                                                      newColName,
                                                      renameMap[j].type));

                        col = new XcSDK.Column(newColName,
                                               winCols[j].getType());
                        winColFinal.lag.push(col);
                    }

                    newTableName = self.createTableName(null, "_window");
                    rTable = tableNames.lag[i];
                    rCol = rowNumColNames.lag[i];
                    defChain.push(self.join.bind(self, joinType,
                                                 {"tableName": lTable,
                                                  "columns" : lCol},
                                                 {"tableName": rTable,
                                                  "columns": rCol,
                                                  "rename" : renameMapTmp},
                                                 newTableName));
                    lTable = newTableName;
                }

                for (i = 0; i < lead; i++) {
                    var renameMapTmp = [];
                    for (j = 0; j < renameMap.length; j++) {
                        newColName = renameMap[j].orig + "_lead_" + (i + 1);
                        renameMapTmp.push(
                            xcHelper.getJoinRenameMap(renameMap[j].orig,
                                                      newColName,
                                                      renameMap[j].type));

                        col = new XcSDK.Column(newColName,
                                               winCols[j].getType());
                        winColFinal.lead.push(col);
                    }

                    newTableName = self.createTableName(null, "_window");
                    rTable = tableNames.lead[i];
                    rCol = rowNumColNames.lead[i];
                    defChain.push(self.join.bind(self, joinType,
                                                 {"tableName": lTable,
                                                  "columns" :lCol},
                                                 {"tableName": rTable,
                                                  "columns": rCol,
                                                  "rename" : renameMapTmp},
                                                 newTableName));
                    lTable = newTableName;
                }

                finalTableName = newTableName;

                return XcSDK.Promise.chain(defChain);
            })
            .then(function() {
                // Step 6: Sort on the original sortCol
                newTableName = self.createTableName(null, "_window");
                return self.sort(direction, rowNumCol,
                                 finalTableName, newTableName);
            })
            .then(function(tableAfterSort) {
                // Step 7: YAY WE ARE FINALLY DONE! pick out the columns
                var table = self.getTable(tableAfterSort);
                if (table != null) {
                    table.deleteAllCols();
                    table.addCol(sortCol);
                    var numWinCols = winCols.length;
                    var winColNames = [];

                    for (var i = 0; i < numWinCols; i++) {
                        for (var k = lag-1; k >= 0; k--) {
                            table.addCol(winColFinal.lag[i + k*numWinCols]);
                        }

                        table.addCol(winCols[i]);
                        winColNames.push(winCols[i].getName());

                        for (var k = 0; k < lead; k++) {
                            table.addCol(winColFinal.lead[i + k*numWinCols]);
                        }
                    }

                    var srcCols = ext.getTriggerTable().tableCols;
                    for (var i = 0; i < srcCols.length; i++) {
                        var colName = srcCols[i].getBackColName();
                        var colType = srcCols[i].getType();
                        if (winColNames.includes(colName) ||
                            colName == "DATA" ||
                            colName == sortCol.getName()) {
                            continue;
                        }

                        var col = new XcSDK.Column(colName, colType);
                        table.addCol(col);
                    }

                    return table.addToWorksheet();
                }

            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }

    function winSortTable(ext, colToSort, direction) {
        var deferred = XcSDK.Promise.deferred();
        var srcTable = ext.getTriggerTable().getName();
        var colName = colToSort.getName();

        ext.sort(direction, colName, srcTable)
        .then(deferred.resolve)
        .fail(function(error, sorted) {
            if (sorted) {
                // when already sort correctly on the column
                deferred.resolve(srcTable);
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    function winGenRowNum(ext, srcTable) {
        var deferred = XcSDK.Promise.deferred();
        var newColName = "orig_order_" + ext.getAttribute("randNumber");

        ext.getRowNum(srcTable, newColName)
        .then(function(newTableName) {
            return (ext.index(newColName, newTableName));
        })
        .then(function(newTableName) {
            deferred.resolve(newTableName, newColName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function winProject(ext, srcTable) {
        var deferred = XcSDK.Promise.deferred();
        var newColName = "orig_order_" + ext.getAttribute("randNumber");

        var winColFinal = ext.getAttribute("winColFinal");
        var renameMap = ext.getAttribute("renameMap");
        var winCols = ext.getArgs().winCols;
        var winColNames = [];
        var defChain = [];
        var newTableName, newColName, mapStr, prefix, col;
        newTableName = srcTable;

        // extract all fatptr cols as immediates by casting to same type
        for (var i = 0; i < winCols.length; i++) {
            prefix = winCols[i].getPrefix();
            if (prefix != "") {
                mapStr = winCols[i].getTypeForCast() +
                    "(" + winCols[i].getName() + ")";

                newTableName = ext.createTableName(null, "_project");
                newColName = prefix + "_" + winCols[i].getParsedName();

                if (ext.getAttribute("avoidCollision")) {
                    newColName += "_win" + ext.getAttribute("randNumber");
                }

                defChain.push(ext.map.bind(ext, mapStr, srcTable, newColName,
                                           newTableName));
                srcTable = newTableName;
            } else {
                newColName = winCols[i].getName();
            }

            winColNames.push(newColName);
            col = new XcSDK.Column(newColName, winCols[i].getType());
            winColFinal.cur.push(col);

            renameMap.push(xcHelper.getJoinRenameMap(newColName, "", null));
        }

        XcSDK.Promise.chain(defChain)
        .then(function() {
            return (ext.project(winColNames, newTableName));
        })
        .then(function(tableAfterProject) {
            deferred.resolve(tableAfterProject);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function windLagLeadMap(ext, state, index, srcTable, rowNumCol) {
        var deferred = XcSDK.Promise.deferred();


        var tableNames = ext.getAttribute("tableNames");
        var rowNumColNames = ext.getAttribute("rowNumColNames");
        var winState = ext.getAttribute("winState");
        var randNumber = ext.getAttribute("randNumber");

        var newColName;
        var mapStr;
        var suffix = (index + 1);
        var tableNameSuffix;

        if (state === winState.lag) {
            // lagMapString
            mapStr = "int(add(" + rowNumCol + ", " + suffix + "))";
            tableNameSuffix = "_" + randNumber + "_lag_" + suffix;
            newColName = "lag_" + suffix + "_" + randNumber;

        } else if (state === winState.lead) {
            // leadMapString
            mapStr = "int(sub(" + rowNumCol + ", " + suffix + "))";
            tableNameSuffix = "_" + randNumber + "_lead_" + suffix;
            newColName = "lead_" + suffix + "_" + randNumber;
        }  else {
            throw "Error Case!";
        }

        var newTableName = ext.createTableName(null, tableNameSuffix);

        ext.map(mapStr, srcTable, newColName, newTableName)
        .then(function(tableAfterMap) {
            return (ext.index(newColName, newTableName));
        })
        .then(function(tableAfterIndex) {
            // cache tableName and colName for later user
            tableNames[state][index] = tableAfterIndex;
            rowNumColNames[state][index] = newColName;

            deferred.resolve(tableAfterIndex);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getUniqueValues(ext) {
        var deferred = XcSDK.Promise.deferred();
        var partitionCol = ext.getArgs().partitionCol;
        var keyColName = partitionCol.getName();
        var srcTable = ext.getTriggerTable().getName();
        var rowsToFetch = ext.getArgs().partitionNums;

        // Step 1. Do groupby count($partitionCol), GROUP BY ($partitionCol)
        // aka, index on partitionCol and then groupby count
        // this way we get the unique value of src table
        var isIncSample = false;
        var groupByCol = ext.createColumnName();
        var groupbyTable = ext.createTempTableName("GB.");
        var aggOp = XcSDK.Enums.AggType.Count;

        ext.groupBy(aggOp, keyColName, keyColName,
                    isIncSample, srcTable,
                    groupByCol, groupbyTable)
        .then(function(tableAfterGroupby) {
            // Step 2. Sort on desc on groupby table by groupByCol
            // this way, the partitionCol that has most count comes first
            var sortTable = ext.createTempTableName("GB-Sort.");
            return ext.sortDescending(groupByCol, tableAfterGroupby, sortTable);
        })
        .then(function(tableAfterSort) {
            var fetchCol = partitionCol.getParsedName();
            // Step 3, fetch data
            return ext.fetchColumnData(fetchCol, tableAfterSort, 1, rowsToFetch);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function hPartition(ext, fltVal, index) {
        var deferred = XcSDK.Promise.deferred();
        var srcTable = ext.getTriggerTable().getName();
        var filterTable = ext.createTableName(null, "-HP" + (index + 1));
        var col = ext.getArgs().partitionCol;
        var colName = col.getName();
        var colType = col.getType();
        var fltStr;

        switch (colType) {
            case "string":
                fltStr = "eq(" + colName + ", \"" + fltVal + "\")";
                break;
            default:
                // integer, float and boolean
                fltStr = "eq(" + colName + ", " + fltVal + ")";
                break;
        }

        ext.filter(fltStr, srcTable, filterTable)
        .then(function(tableAfterFilter) {
            var table = ext.getTable(tableAfterFilter);
            if (table != null) {
                return table.addToWorksheet();
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    return (UExtXcalarDef);
}({}));
