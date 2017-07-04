window.UExtDataCube = (function(UExtDataCube) {
    UExtDataCube.buttons = [{
        "buttonText": "OLAP Cube Analysis",
        "fnName": "dataCube",
        "arrayOfFields": [{
            "type": "column",
            "name": "Dimension",
            "fieldClass": "label",
            "typeCheck": {
                "columnType": ["number", "string", "boolean"]
            },
            "variableArg": true
        },
        {
            "type": "string",
            "name": "Dimension Roll-UP UDF",
            "fieldClass": "aggUDF",
            "variableArg": true,
            "typeCheck": {
                "allowEmpty": true,
            }
        },
        {
            "type": "column",
            "name": "Value",
            "fieldClass": "cubeCell",
            "autofill": true,
            "typeCheck": {
                "columnType": ["number"]
            },
        },
        {
            "type": "string",
            "name": "Agg Func",
            "fieldClass": "aggFunc",
            "enums": ["Avg", "Count", "Sum", "Max", "Min"],
            "autofill": "Avg"
        }]
    },
    {
        "buttonText": "Pivot",
        "fnName": "pivot",
        "arrayOfFields": [{
            "type": "column",
            "name": "Row",
            "fieldClass": "row",
            "typeCheck": {
                "columnType": ["number", "string", "boolean"]
            }
        },
        {
            "type": "column",
            "name": "Col",
            "fieldClass": "col",
            "typeCheck": {
                "columnType": ["number", "string", "boolean"]
            },
            "variableArg": true
        },
        {
            "type": "column",
            "name": "Value",
            "fieldClass": "cubeCell",
            "autofill": true,
            "typeCheck": {
                "columnType": ["number", "string", "boolean"]
            }
        }]
    }];

    UExtDataCube.actionFn = function(functionName) {
        switch (functionName) {
            case ("dataCube"):
                return dataCubeExt();
            case ("pivot"):
                return pivotExt();
            default:
                return null;
        }
    };

    function dataCubeExt() {
        var ext = new XcSDK.Extension;

        ext.start = function() {
            var deferred = XcSDK.Promise.deferred();
            applyAggUDF(ext)
            .then(function(groupByCols, tableAfterAggUDF) {
                return groupbyDimension(ext, groupByCols, tableAfterAggUDF);
            })
            .then(function(finalTable) {
                var table = ext.getTable(finalTable);
                return table.addToWorksheet();
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }

    function applyAggUDF(ext) {
        var deferred = XcSDK.Promise.deferred();
        var args = ext.getArgs();
        var srcTable = ext.getTriggerTable().getName();
        var promises = [];
        var groupByCols = [];

        var labels = args.label instanceof Array
                     ? args.label
                     : [args.label];
        var udfs = args.aggUDF instanceof Array
                   ? args.aggUDF
                   : [args.aggUDF];
        var curTable = srcTable;
        var nextTable = srcTable;

        for (var i = 0, len = labels.length; i < len; i++) {
            var colName = labels[i].getName();
            if (!udfs[i]) {
                groupByCols.push(colName);
                continue;
            }

            var mapStr = "datacube:" + udfs[i] + "(" + colName + ")";
            var newColName = udfs[i];

            groupByCols.push(newColName);
            curTable = nextTable;
            nextTable = ext.createTempTableName(null, "_aggUDF");

            promises.push(ext.map.bind(ext, mapStr, curTable,
                                        newColName, nextTable));
        }

        XcSDK.Promise.chain(promises)
        .then(function() {
            deferred.resolve(groupByCols, nextTable);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function groupbyDimension(ext, groupbyCols, tableName) {
        var args = ext.getArgs();

        var aggOp = XcSDK.Enums.AggType[args.aggFunc];
        var aggCol = args.cubeCell.getName();

        var newColName = aggOp.toLowerCase() + "_" + aggCol;
        var newTableName = ext.createTableName(null, null, "dataCube");

        return ext.groupBy(aggOp, groupbyCols, aggCol, tableName, newColName, {
            "newTableName": newTableName
        });
    }

    function pivotExt() {
        var ext = new XcSDK.Extension;

        ext.start = function() {
            var deferred = XcSDK.Promise.deferred();
            var self = this;
            var args = self.getArgs();
            var rowName = args.row.getName();
            var cols = args.col instanceof Array ? args.col : [args.col];

            var uniqueVals = [];
            var uniqueCols = [];
            var concatCol;
            var groupByCol = "list_concat";
            var finalTable;
            var mapCols = [];

            getColUniqueValues(ext, cols)
            .then(function(resVals, resCols) {
                uniqueVals = resVals;
                uniqueCols = resCols;
                concatCol = ext.createColumnName();
                return pivotConcat(ext, cols, concatCol);
            })
            .then(function(tableAfterMap) {
                // groupby listAgg
                var aggOp = XcSDK.Enums.AggType.ListAgg;
                var options = {
                    "newTableName": ext.createTempTableName(".GB.")
                };
                return ext.groupBy(aggOp, rowName, concatCol,
                                   tableAfterMap, groupByCol, options);
            })
            .then(function(tableAfterGroupby) {
                finalTable = tableAfterGroupby;
                // split
                var promises = [];
                var curTable = tableAfterGroupby;
                var nextTable = tableAfterGroupby;

                for (var i = 0, len = uniqueVals.length; i < len; i++) {
                    curTable = nextTable;
                    nextTable = (i === len - 1)
                                ? ext.createTableName(null, null, "pivot")
                                : ext.createTempTableName(".pivot.");
                    var val = uniqueVals[i];
                    var mapCol = uniqueCols[i];
                    var mapStr = "datacube:pivotParse(" + groupByCol + ", " +
                                 "\"" + val + "\")";

                    mapCols.push(mapCol);
                    promises.push(ext.map.bind(ext, mapStr, curTable, mapCol,
                                               nextTable));
                }

                finalTable = nextTable;
                return XcSDK.Promise.chain(promises);
            })
            .then(function() {
                var table = ext.getTable(finalTable);
                table.deleteAllCols();
                table.addCol(args.row);

                mapCols.forEach(function(mapCol) {
                    table.addCol(new XcSDK.Column(mapCol));
                });

                return table.addToWorksheet();
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }

    function getColUniqueValues(ext, cols) {
        var deferred = XcSDK.Promise.deferred();
        var promises = [];
        var uniqueVals = [];
        var uniqueCols = [];

        cols.forEach(function(col) {
            promises.push(getUniqValueHelper.bind(window, ext, col,
                                                    uniqueVals, uniqueCols));
        });

        XcSDK.Promise.chain(promises)
        .then(function() {
            deferred.resolve(uniqueVals, uniqueCols);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    function getUniqValueHelper(ext, partitionCol, uniqueVals, uniqueCols) {
        var deferred = XcSDK.Promise.deferred();
        var keyColName = partitionCol.getName();
        var srcTable = ext.getTriggerTable().getName();

        // Step 1. Do groupby count($partitionCol), GROUP BY ($partitionCol)
        // aka, index on partitionCol and then groupby count
        // this way we get the unique value of src table
        var groupByCol = ext.createColumnName();
        var aggOp = XcSDK.Enums.AggType.Count;
        var options = {
            "newTableName": ext.createTempTableName(".GB.")
        };
        var sortTable;

        ext.groupBy(aggOp, keyColName, keyColName,
                    srcTable, groupByCol, options)
        .then(function(tableAfterGroupby) {
        //     // Step 2. Sort on desc on groupby table by groupByCol
        //     // this way, the partitionCol that has most count comes first
        //     var sortTable = ext.createTempTableName(".GB-Sort.");
        //     return ext.sortAscending(keyColName, tableAfterGroupby, sortTable);
        // })
        // .then(function(tableAfterSort) {
            sortTable = tableAfterGroupby;
            // ste3. get num rows
            return ext.getNumRows(sortTable);
        })
        .then(function(rowsToFetch) {
            var fetchCol = partitionCol.getParsedName();
            // Step 4, fetch data
            return ext.fetchColumnData(fetchCol, sortTable, 1, rowsToFetch);
        })
        .then(function(resVals) {
            if (uniqueVals.length === 0) {
                resVals.forEach(function(val) {
                    uniqueVals.push(val);
                    uniqueCols.push(keyColName + "_" + val);
                });
            } else {
                var oldVals = [];
                var oldCols = [];
                uniqueVals.forEach(function(val, index) {
                    oldVals.push(val);
                    oldCols.push(uniqueCols[index]);
                });

                uniqueVals.length = 0;
                uniqueCols.length = 0;
                for (var i = 0; i < oldVals.length; i++) {
                    for (var j = 0; j < resVals.length; j++) {
                        var newVal = oldVals[i] + "," + resVals[j];
                        uniqueVals.push(newVal);
                        var newColName = oldCols[i] + "-" +
                                         keyColName + "_" + resVals[j];
                        uniqueCols.push(newColName);
                    }
                }
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function pivotConcat(ext, cols, concatCol) {
        // map concat str
        var cubeName = ext.getArgs().cubeCell.getName();
        var mapStr = "datacube:pivotConcat(";
        cols.forEach(function(col) {
            mapStr += col.getName() + ",";
        });
        mapStr += cubeName + ")";
        var srcTable = ext.getTriggerTable().getName();
        var newTableName = ext.createTempTableName(".concat.");
        return ext.map(mapStr, srcTable, concatCol, newTableName);
    }

    return (UExtDataCube);
}({}));
