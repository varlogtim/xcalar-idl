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
        },
        {
            "type": "string",
            "name": "New Table Name",
            "fieldClass": "finalTableName",
            "typeCheck": {
                "allowEmpty": true,
                "newTableName": true
            }
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
            "name": "Cols",
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
        },
        {
            "type": "string",
            "name": "New Table Name",
            "fieldClass": "finalTableName",
            "typeCheck": {
                "allowEmpty": true,
                "newTableName": true
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

        ext.beforeStart = function() {
            var args = ext.getArgs();

            var udfs = args.aggUDF instanceof Array
                   ? args.aggUDF
                   : [args.aggUDF];

            // ensure that no two UDFs have the same name, since column names
            // are dependent on them.
            var uniqueUdfs = {};

            for (var i = 0; i < udfs.length; i++) {
                var udf = udfs[i];
                if (uniqueUdfs[udf]) {
                    return XcSDK.Promise.reject("Two 'Dimension Roll-UP UDFs' "
                        + "cannot have the same name.");
                }
                uniqueUdfs[udf] = true;
            }

            return XcSDK.Promise.resolve();
        };

        ext.start = function() {
            var deferred = XcSDK.Promise.deferred();
            applyAggUDF(ext)
            .then(function(groupByCols, tableAfterAggUDF) {
                // groupByCols are the new columns formed by the UDFs
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

        // apply a UDF on each column which has a corresponding UDF
        for (var i = 0, len = labels.length; i < len; i++) {
            var colName = labels[i].getName();
            if (!udfs[i]) {
                // no UDF for particular column
                groupByCols.push(colName);
                continue;
            }

            var mapStr = "datacube:" + udfs[i] + "(" + colName + ")";
            var newColName = udfs[i];
            // store the name of the new column for eventual groupBy
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
        var finalTableName = args.finalTableName ||
            (ext.tableNameRoot + "-datacube");
        var aggOp = XcSDK.Enums.AggType[args.aggFunc];
        var aggCol = args.cubeCell;

        var newColName = aggOp.toLowerCase() + "_" + aggCol.getParsedName();
        var newTableName = ext.createTableName(null, null, finalTableName);
        var options = {
            "clean": true,
            "newTableName": newTableName
        };
        return ext.groupBy(aggOp, groupbyCols, aggCol.getName(), tableName,
            newColName, options);
    }

    /*
    pivot: rotates a table so that unique values of a column (or multiple
        columns) become the columns of the resultant table. There is a 'Row'
        column who's unique values represent the rows for the resultant table,
        and a 'Value' column, which populates the rows of the newly created
        columns.

    'row': The column whose unique values represent the rows of the resultant
        table
    'col': The columns whose unique values form the columns of the resultant
        table
    'cubeCell': The column which populates the newly formed columns by the
        unique values of 'Cols' with values, for each unique value of 'Row'.
    */
    function pivotExt() {
        var ext = new XcSDK.Extension;

        ext.start = function() {

            var deferred = XcSDK.Promise.deferred();
            var self = this;
            var args = self.getArgs();
            var srcTableName = ext.getTriggerTable().getName();
            var rowName = args.row.getName();
            var cols = args.col instanceof Array ? args.col : [args.col];
            var finalTableName = args.finalTableName ||
                (ext.tableNameRoot + "-pivot");

            var uniqueVals = [];
            var uniqueCols = [];
            var concatCol;
            var groupByCol = ext.createUniqueCol(srcTableName, "list_concat");
            var finalTable;
            var mapCols = [];
            var listAggSep = '"|Xc|"';

            getColUniqueValues(ext, cols)
            .then(function(resVals, resCols) {
                // resVals are the unique values of 'cols'
                // resCols[i] is the column names that represents resVals[i]
                uniqueVals = resVals;
                uniqueCols = resCols;
                concatCol = ext.createColumnName();
                // concatenate 'cols' and cubecells with ',' as the separator
                // each concatenated field ends with "|.LAS.|" to distinguish
                // different fields after the groupBy with listAgg.
                return pivotConcat(ext, cols, concatCol, listAggSep);
            })
            .then(function(tableAfterMap) {
                var aggOp = XcSDK.Enums.AggType.ListAgg;
                var options = {
                    "clean": true,
                    "newTableName": ext.createTempTableName(".GB.")
                };
                return ext.groupBy(aggOp, rowName, concatCol,
                                   tableAfterMap, groupByCol, options);
            })
            .then(function(tableAfterGroupby) {
                // each unique value of 'row' now forms a record with another
                // field, which is a concatenation of all records of the
                // 'concatCol' created above that occur with this value
                finalTable = tableAfterGroupby;
                var promises = [];
                var curTable = tableAfterGroupby;
                var nextTable = tableAfterGroupby;

                // In each iteration, we create a promise that will extract the
                // substring that contains the 'cubeCell' value for the current
                // column (which was formed from the unique values of 'cols')
                for (var i = 0, len = uniqueVals.length; i < len; i++) {
                    curTable = nextTable;
                    nextTable = (i === len - 1)
                        ? ext.createTableName(null, null, finalTableName)
                        : ext.createTempTableName(".pivot.");
                    // mapCol needs to be filled with the 'cubeCell' value
                    // occuring with 'val'
                    var val = uniqueVals[i];
                    var mapCol = uniqueCols[i];
                    // findStr returns the start index of the 'val' after which
                    // the required 'cubecell value will be found'
                    var findStr = "find(" + groupByCol + ', "' + val + ',", 0, 0)';
                    // mapStr format is: substring(substring(Col, findStr,
                    // find(Col, val, findStr, 0)), 1 + length of val, 0)
                    // The first substing gives the entire record in 'concatCol'
                    // that we were looking for (except the separator), the
                    // second extracts the 'cubeCell' value
                    var mapStr = "substring(substring(" + groupByCol + ", " +
                        findStr + ", find(" + groupByCol + ', ' + listAggSep +
                        ', ' + findStr + ', 0)), ' + (val.length + 1) + ', 0)';

                    mapCols.push(mapCol);
                    promises.push(ext.map.bind(ext, mapStr, curTable, mapCol,
                                               nextTable));
                }

                finalTable = nextTable;
                return XcSDK.Promise.chain(promises);
            })
            .then(function() {
                // display the newly formed columns and hide 'groupByCol'
                var table = ext.getTable(finalTable);
                table.deleteAllCols();
                table.addCol(new XcSDK.Column(args.row.getParsedName()));

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

        // create a promise for col in 'cols' to extract its unique values
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

        var uniqueValTable;
        var rootColName = ext.createUniqueCol(srcTable,
            keyColName.replace("::", "_"));
        var fetchColName;

        var groupByCol = ext.createColumnName();
        var aggOp = XcSDK.Enums.AggType.Count;
        var options = {
            "clean": "true",
            "newTableName": ext.createTempTableName(".GB.")
        };

        // Do groupby count($partitionCol), GROUP BY ($partitionCol)
        // aka, index on partitionCol and then groupby count
        // this way we get the unique value of this column in src table
        ext.groupBy(aggOp, keyColName, keyColName, srcTable, groupByCol,
            options)
        .then(function(tableAfterGroupby, colsAfterGroupBy) {
            uniqueValTable = tableAfterGroupby;
            fetchColName = colsAfterGroupBy[1].getName();
            return ext.getNumRows(uniqueValTable);
        })
        .then(function(rowsToFetch) {
            // fetch data that contains the unique values
            return ext.fetchColumnData(fetchColName, uniqueValTable, 1,
                rowsToFetch);
        })
        .then(function(resVals) {
            if (uniqueVals.length === 0) {
                // if this is the first column, simply store unique values
                // and their corresponding column names
                resVals.forEach(function(val) {
                    uniqueVals.push(val);
                    uniqueCols.push(rootColName + "_" + val);
                });
            } else {
                // if there already unique values from a previous column, the
                // unique values (and cols) become the cartesian product of
                // old unique values and the new unique values from this col.
                var oldVals = [];
                var oldCols = [];
                // store the old values
                uniqueVals.forEach(function(val, index) {
                    oldVals.push(val);
                    oldCols.push(uniqueCols[index]);
                });

                uniqueVals.length = 0;
                uniqueCols.length = 0;
                // take the cartesian product and store the values for the next
                // call in the promise chain
                for (var i = 0; i < oldVals.length; i++) {
                    for (var j = 0; j < resVals.length; j++) {
                        var newVal = oldVals[i] + "," + resVals[j];
                        uniqueVals.push(newVal);
                        var newColName = oldCols[i] + "-" +
                                         rootColName + "_" + resVals[j];
                        uniqueCols.push(newColName);
                    }
                }
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function pivotConcat(ext, cols, concatCol, sep) {
        var cubeCell = ext.getArgs().cubeCell;
        // cast non-string columns to string for concatenation
        var strColNames = cols.map(function(col) {
            if (col.getType() !== "string") {
                return "string(" + col.getName() + ")";
            } else {
                return col.getName();
            }
        });
        var mapStr = 'concat(';
        strColNames.forEach(function(colName) {
            mapStr += colName + ', concat(",", concat(';
        });
        var cubeColName = cubeCell.getName();
        // cast cubeColName for concatenation if required
        if (cubeCell.getType() !== "string") {
            cubeColName = "string(" + cubeColName + ")";
        }
        var endParens = ")".repeat(2 * cols.length + 1);
        // concatenation result: <col0>,...,<colN>,<cubeCell>,sep
        mapStr += cubeColName + ', ' + sep + endParens;
        var srcTable = ext.getTriggerTable().getName();
        var newTableName = ext.createTempTableName(".concat.");
        return ext.map(mapStr, srcTable, concatCol, newTableName);
    }

    return (UExtDataCube);
}({}));
