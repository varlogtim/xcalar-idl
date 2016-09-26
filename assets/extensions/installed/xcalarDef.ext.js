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
            "fieldClass": "winCol",
            "autofill"  : true,
            "typeCheck" : {
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

            // set some useful attribute
            self.setAttribute("randNumber", Math.floor(Math.random() * 100));
            // constant to mark it's a lag table, lead table, or current table
            self.setAttribute("WinState", {
                "lag" : "lag",
                "lead": "lead",
                "cur" : "cur"
            });

            // cache tableNames for lag, lead and cur table
            self.setAttribute("tableNames", {
                "lag" : [],
                "lead": [],
                "cur" : ""
            });

            // cache renamed col of the colName in lag, lead and cur table
            self.setAttribute("winColNames", {
                "lag" : [],
                "lead": [],
                "cur" : ""
            });

            // cache names of genUniq col in lag, lead and cur table
            self.setAttribute("genUniqColNames", {
                "lag" : [],
                "lead": [],
                "cur" : ""
            });
        };

        ext.start = function() {
            var deferred = XcSDK.Promise.deferred();
            var self = this;
            var args = self.getArgs();
            var sortCol = args.sortCol;
            var winCol = args.winCol;
            var direction = args.order;
            var lag = args.lag;
            var lead = args.lead;

            var WinState = self.getAttribute("WinState");
            var finalTableName;
            var newOrigSortedOnCol;

            // Step 1: sort table
            winSortTable(self, sortCol, direction)
            .then(function(tableAfterSort) {
                // Step 2: Get Row Num Column, on SORTED table.
                return winGenRowNum(self, tableAfterSort);
            })
            .then(function(tableWithRowNum, rowNumCol) {
                // Step 3: Generate the columns for lag and lead. We need to
                // duplicate current table to have a unique column name if not
                // later we will suffer when we self join
                var defArray = [];
                var i;
                for (i = 0; i < lag; i++) {
                    defArray.push(windLagLeadMap(self, WinState.lag, i,
                                                tableWithRowNum, rowNumCol));
                }

                for (i = 0; i < lead; i++) {
                    defArray.push(windLagLeadMap(self, WinState.lead, i,
                                                tableWithRowNum, rowNumCol));
                }

                defArray.push(windLagLeadMap(self, WinState.cur, -1,
                                            tableWithRowNum, rowNumCol));
                return XcSDK.Promise.when.apply(window, defArray);
            })
            .then(function() {
                // Step 4: Create unique col names for each of the tables
                // This is so that we don't suffer when we self join
                var defArray = [];
                var i;
                for (i = 0; i < lag; i++) {
                    defArray.push(winColRename(self, WinState.lag, i, winCol));
                }
                for (i = 0; i < lead; i++) {
                    defArray.push(winColRename(self, WinState.lead, i, winCol));
                }

                defArray.push(winColRename(self, WinState.cur, -1, winCol));
                return XcSDK.Promise.when.apply(window, defArray);
            })
            .then(function() {
                // Step 5: Need to rename the original sorted by column in cur
                // table to avoid name collisions
                return windRenameSortCol(ext, sortCol);
            })
            .then(function(tableAfterCast, newColName) {
                newOrigSortedOnCol = newColName;
                // Step 6: inner join funnesss!
                // Order: Take cur, join lags then join leads
                var defChain = [];

                var tableNames = self.getAttribute("tableNames");
                var genUniqColNames = self.getAttribute("genUniqColNames");
                var joinType = XcSDK.Enums.JoinType.InnerJoin;
                var lTable = tableNames.cur;
                var lCol = genUniqColNames.cur;
                var rTable;
                var rCol;
                var newTableName;
                var i;

                for (i = 0; i < lag; i++) {
                    newTableName = self.createTableName(null, "_window");
                    rTable = tableNames.lag[i];
                    rCol = genUniqColNames.lag[i];
                    finalTableName = newTableName;
                    defChain.push(self.join.bind(self, joinType, lCol, lTable,
                                                 rCol, rTable, newTableName));
                    lTable = newTableName;
                }

                for (i = 0; i < lead; i++) {
                    newTableName = self.createTableName(null, "_window");
                    rTable = tableNames.lead[i];
                    rCol = genUniqColNames.lead[i];
                    finalTableName = newTableName;
                    defChain.push(self.join.bind(self, joinType, lCol, lTable,
                                                rCol, rTable, newTableName));
                    lTable = newTableName;
                }

                return XcSDK.Promise.chain(defChain);
            })
            //.then(function() {
            //    // Step 7: Sort ascending or descending by the cur order number
            //    return self.sort(direction, newOrigSortedOnCol, finalTableName);
            //})
            .then(function() {
                // Step 8: YAY WE ARE FINALLY DONE! Just start picking out all
                // the columns now and do the sort and celebrate
                var table = self.getTable(finalTableName);
                if (table != null) {
                    table.deleteAllCols();
                    // Don't pull cur. Instead pull the original sorted col which
                    // cur was generated on.
                    var winColNames = self.getAttribute("winColNames");
                    var colType = sortCol.getType();
                    if (colType === "integer" || colType === "float") {
                        colType = "float";
                    }
                    var winColType = winCol.getType();
                    if (winColType === "integer" || winColType === "float") {
                        winColType = "float";
                    }

                    var col = new XcSDK.Column(newOrigSortedOnCol, colType);
                    table.addCol(col);
                    for (var i = lag - 1; i >= 0; i--) {
                        col = new XcSDK.Column(winColNames.lag[i], winColType);
                        table.addCol(col);
                    }

                    col = new XcSDK.Column(winColNames.cur, winColType);
                    table.addCol(col);

                    for (var i = 0; i < lead; i++) {
                        col = new XcSDK.Column(winColNames.lead[i], winColType);
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

    function windLagLeadMap(ext, state, index, srcTable, rowNumCol) {
        var deferred = XcSDK.Promise.deferred();

        var tableNames = ext.getAttribute("tableNames");
        var genUniqColNames = ext.getAttribute("genUniqColNames");
        var WinState = ext.getAttribute("WinState");
        var randNumber = ext.getAttribute("randNumber");

        var newColName;
        var mapStr;
        var suffix = (index + 1);
        var tableNameSuffix;

        if (state === WinState.lag) {
            // lagMapString
            mapStr = "add(" + rowNumCol + ", " + suffix + ")";
            tableNameSuffix = "_" + randNumber + "_lag_" + suffix;
            newColName = "lag_" + suffix + "_" + randNumber;

        } else if (state === WinState.lead) {
            // leadMapString
            mapStr = "sub(" + rowNumCol + ", " + suffix + ")";
            tableNameSuffix = "_" + randNumber + "_lead_" + suffix;
            newColName = "lead_" + suffix + "_" + randNumber;
        } else if (state === WinState.cur) {
            // curMapString
            mapStr = "float(" + rowNumCol + ")";
            tableNameSuffix = "_" + randNumber + "_cur";
            newColName = "cur_" + randNumber;
        } else {
            throw "Error Case!";
        }

        var newTableName = ext.createTableName(null, tableNameSuffix);
        // cache tableName and colName for later user
        if (state === WinState.cur) {
            tableNames.cur = newTableName;
            genUniqColNames.cur = newColName;
        } else {
            tableNames[state][index] = newTableName;
            genUniqColNames[state][index] = newColName;
        }

        ext.map(mapStr, srcTable, newColName, newTableName)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function winColRename(ext, state, index, winCol) {
        var deferred = XcSDK.Promise.deferred();

        var tableNames = ext.getAttribute("tableNames");
        var winColNames = ext.getAttribute("winColNames");
        var WinState = ext.getAttribute("WinState");

        var winColName = winCol.getName();
        var winColType = winCol.getType();
        var newColName;

        var srcTable;
        var suffix = (index + 1);
        var mapStr = "(" + winColName + ")";
        if (winColType === "string") {
            mapStr = "string" + mapStr;
        } else {
            mapStr = "float" + mapStr;
        }

        if (state === WinState.lag) {
            // lag
            srcTable = tableNames.lag[index];
            newColName = "lag_" + suffix + "_" + winColName;
        } else if (state === WinState.lead) {
            // lead
            srcTable = tableNames.lead[index];
            newColName = "lead_" + suffix + "_" + winColName;
        } else if (state === WinState.cur) {
            // cur
            srcTable = tableNames.cur;
            newColName = "cur_" + winColName;
        } else {
            return XcSDK.Promise.reject("Error Case");
        }

        var newTableName = ext.createTableName(null, null, srcTable);
        // update tableName and cache colName
        if (state === WinState.cur) {
            tableNames.cur = newTableName;
            winColNames.cur = newColName;
        } else {
            tableNames[state][index] = newTableName;
            winColNames[state][index] = newColName;
        }

        ext.map(mapStr, srcTable, newColName, newTableName)
        .then(function(tableAfterMap) {
            var table = ext.getTable(tableAfterMap);
            if (table != null) {
                // add the col to meta
                var colNum = table.getColNum(winCol);
                if (colNum > 0) {
                    var col = new XcSDK.Column(newColName, winColType);
                    // inseart to col before winCol
                    table.addCol(col, colNum - 1);
                }
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function windRenameSortCol(ext, sortCol) {
        var deferred = XcSDK.Promise.deferred();

        var colName = sortCol.getName();
        var colType = sortCol.getType();
        var mapStr;

        switch (colType) {
            // this is front end think of type, inaccurate,
            // so cast it to float
            case "integer":
            case "float":
                mapStr = "float(" + colName + ")";
                break;
            case "boolean":
                mapStr = "bool(" + colName + ")";
                break;
            case "string":
                mapStr = "string(" + colName + ")";
                break;
            default:
                return XcSDK.Promise.reject("Wrong type in window");
        }

        var tableNames = ext.getAttribute("tableNames");
        var srcTable = tableNames.cur;

        var newColName = "orig_" + colName + "_" + ext.getAttribute("randNumber");
        var newTableName = ext.createTableName(null, null, srcTable);

        tableNames.cur = newTableName;

        ext.map(mapStr, srcTable, newColName, newTableName)
        .then(function(tableAfterMap) {
            deferred.resolve(tableAfterMap, newColName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getUniqueValues(ext) {
        var deferred = XcSDK.Promise.deferred();
        var keyCol = ext.getArgs().partitionCol.getName();
        var srcTable = ext.getTriggerTable().getName();
        var rowsToFetch = ext.getArgs().partitionNums;

        // Step 1. Do groupby count($keyCol), GROUP BY ($keyCol)
        // aka, index on keyCol and then groupby count
        // this way we get the unique value of src table
        var isIncSample = false;
        var groupByCol = ext.createColumnName();
        var groupbyTable = ext.createTempTableName("GB.");
        var aggOp = XcSDK.Enums.AggType.Count;

        ext.groupBy(aggOp, keyCol, keyCol,
                    isIncSample, srcTable,
                    groupByCol, groupbyTable)
        .then(function(tableAfterGroupby) {
            // Step 2. Sort on desc on groupby table by groupByCol
            // this way, the keyCol that has most count comes first
            var sortTable = ext.createTempTableName("GB-Sort.");
            return ext.sortDescending(groupByCol, tableAfterGroupby, sortTable);
        })
        .then(function(tableAfterSort) {
            // Step 3, fetch data
            return ext.fetchColumnData(keyCol, tableAfterSort, 1, rowsToFetch);
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

