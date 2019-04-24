// module name must start with "UExt"
window.UExtConditionalSelect = (function(UExtConditionalSelect) {
    UExtConditionalSelect.buttons = [{
        "buttonText": "Conditional Select",
        "fnName": "conditionalSelect",
        "arrayOfFields": [{
            "type": "column",
            "name": "Sort On",
            "fieldClass": "sortCol",
            "autofill": true,
            "typeCheck": {
                "columnType": ["number"]
            }
        },
        {
            "type": "string",
            "name": "Aggregate Functions",
            "fieldClass": "aggFunc",
            "enums": ["Max", "Min"]
        },
        {
            "type": "column",
            "name": "Column to Select",
            "fieldClass": "selectCols",
            "variableArg": true
        },
        {
            "type": "column",
            "name": "Group On",
            "fieldClass": "groupCols",
            "variableArg": true,
            "typeCheck": {
                "columnType": ["number", "string", "boolean"]
            }
        }],
    }];

    UExtConditionalSelect.actionFn = function(functionName) {
        // it's a good convention to use switch/case to handle
        // different function in the extension and handle errors.
        switch (functionName) {
            case "conditionalSelect":
                return conditionalSelect();
            default:
                return null;
        }
    };

    function conditionalSelect() {
        var ext = new XcSDK.Extension();
        /*
         * steps:
         *  1.1. GroupBy [groupC1, groupC2, groupC3, ...]
         *  max/min(sortCol) -> t1.1
         *  1.2. join t1.1 with t0 on [groupC1, groupC2, groupC3, ..., sortCol]
         *  -> t1.2
         *  1.3 group by [groupC1, groupC2, groupC3, ...]
         *  count(sortCol), include sample (selectedC1, selectC2...)
         *  -> t1
         *  2. rename selectC1, selectC2, .. to
         *  selectC1_max/min_SortCol, selectC2_max/min_SortCol, ... => t2,
         *  3. multi join t2 back to t0 by
         *  [groupC1, groupC2, groupC3, ...] => t3
         */
        ext.start = function() {
            var deferred = XcSDK.Promise.deferred();

            var self = this;
            var args = self.getArgs();

            var srcTable = self.getTriggerTable();
            var srcTableName = self.getTriggerTable().getName();

            var sortColName = args.sortCol.getName();
            var operator = getAggOperator(args.aggFunc);
            var selectColNames = getColNames(args.selectCols);
            var groupByCols = getColNames(args.groupCols);
            var renamedSelectedCols = [];

            // step 1: group by
            conditionalGroupby(ext, operator, groupByCols, sortColName)
            .then(function(ret) {
                const tableAfterGroupby = ret.dstTable;
                // step 2 rename
                var promises = [];
                var selectCols = args.selectCols instanceof Array
                                 ? args.selectCols
                                 : [args.selectCols];

                var curTable = null;
                var nextTable = tableAfterGroupby;

                for (var i = 0; i < selectCols.length; i++) {
                    curTable = nextTable;
                    nextTable = ext.createTempTableName();

                    var col = selectCols[i];
                    var mapStr = col.getTypeForCast() + "(" + col.getName() + ")";
                    var newMapCol = selectCols[i].getParsedName() + "_" +
                                    operator.toLowerCase() + "_" +
                                    args.sortCol.getParsedName();
                    renamedSelectedCols[i] = newMapCol;
                    promises.push(ext.map.bind(ext, mapStr, curTable,
                                               newMapCol, nextTable));
                }

                return XcSDK.Promise.chain(promises);
            })
            .then(function(tableAfterRename) {
                // step 2.2, project to remove unecessary columns
                var columns = groupByCols.concat(renamedSelectedCols);
                var newTableName = ext.createTempTableName();
                return ext.project(columns, tableAfterRename, newTableName);
            })
            .then(function(tableAfterProject) {
                // step 3, join back
                var joinType = XcSDK.Enums.JoinType.InnerJoin;
                var lTableInfo = {
                    "tableName": srcTableName,
                    "columns": groupByCols
                };
                var rTableInfo = {
                    "tableName": tableAfterProject,
                    "columns": groupByCols,
                    "rename": getRenameMap(ext, args.groupCols)
                };
                var joinOpts = {
                    "clean": true,
                    "newTableName": ext.createTableName()
                };
                return ext.join(joinType, lTableInfo, rTableInfo, joinOpts);
            })
            .then(function(finalTable) {
                // step 4, finalTable
                var table = ext.getTable(finalTable);
                table.deleteAllCols();
                var pulledCols = getColsToPull(srcTable.getColNamesAsArray(),
                                               selectColNames,
                                               renamedSelectedCols);
                pulledCols.forEach(function(col) {
                    table.addCol(col);
                });

                return table.addToWorksheet();
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        // Do not forget to return the extension
        return ext;
    }

    function conditionalGroupby(ext, operator, groupByCols, sortColName) {
        var deferred = XcSDK.Promise.deferred();
        var srcTableName = ext.getTriggerTable().getName();
        var newColName = operator.toLowerCase() + "_" +
                         ext.createColumnName();
        var options = {
            "newTableName": ext.createTempTableName(),
            "clean": true
        };

        // 1.1 group by
        ext.groupBy(operator, groupByCols, sortColName,
                    srcTableName, newColName, options)
        .then(function(ret) {
            // 1.2 join back
            const tableAfterGroupby = ret.dstTable;
            const cols = ret.dstColumnsSDK;
            var joinType = XcSDK.Enums.JoinType.InnerJoin;
            var lTableInfo = {
                "tableName": srcTableName,
                "columns": [sortColName].concat(groupByCols)
            };
            var rCols = [];
            cols.forEach(function(col) {
                var name = col.getName();
                if (name !== "DATA") {
                    rCols.push(name);
                }
            });
            var rTableInfo = {
                "tableName": tableAfterGroupby,
                "columns": rCols,
            };
            var joinOpts = {
                "clean": true,
                "newTableName": ext.createTempTableName()
            };
            return ext.join(joinType, lTableInfo, rTableInfo, joinOpts);
        })
        .then(function(tableAfterJoin) {
            // another group with include sample
            operator = XcSDK.Enums.AggType.Count;
            newColName = operator.toLowerCase() + "_" +
                         ext.createColumnName();
            options = {
                "isIncSample": true,
                "newTableName": ext.createTempTableName(),
                "clean": true
            };

            return ext.groupBy(operator, groupByCols, sortColName,
                               tableAfterJoin, newColName, options);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getAggOperator(operator) {
        switch (operator.toLowerCase()) {
            case "max":
                return XcSDK.Enums.AggType.Max;
            case "min":
                return XcSDK.Enums.AggType.Min;
            default:
                return null;
        }
    }

    function getColNames(cols) {
        cols = cols instanceof Array ? cols : [cols];
        return cols.map(function(col) {
            return col.getName();
        });
    }

    function getRenameMap(ext, groupCols) {
        var renameMaps = [];
        groupCols = groupCols instanceof Array
                    ? groupCols
                    : [groupCols];
        var prefixCache = {};
        groupCols.forEach(function(col) {
            var prefix = col.getPrefix();
            var rename;
            var newName;
            if (prefix != null) {
                if (!prefixCache.hasOwnProperty(prefix)) {
                    prefixCache[prefix] = true;
                    newName = prefix + "_new";
                    rename = ext.getJoinRenameMap(prefix, newName, true);
                    renameMaps.push(rename);
                }
            } else {
                var colName = col.getParsedName();
                newName = colName + "_new";
                rename = ext.getJoinRenameMap(colName, newName);
                renameMaps.push(rename);
            }
        });
        return renameMaps;
    }

    function getColsToPull(srcCols, selectColNames, renamedSelectedCols) {
        var cols = [];
        srcCols.forEach(function(colName) {
            // XXX this should be handled in tableApi
            if (colName === "DATA") {
                return true;
            }
            var colToAdd = colName;
            for (var i = 0; i < selectColNames.length; i++) {
                if (selectColNames[i] === colName) {
                    colToAdd = renamedSelectedCols[i];
                    break;
                }
            }
            cols.push(new XcSDK.Column(colToAdd));
        });
        return cols;
    }

    return UExtConditionalSelect;
}({}));