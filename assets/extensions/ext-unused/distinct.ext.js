window.UExtDistinct = (function(UExtDistinct) {

    UExtDistinct.buttons = [{
        "buttonText": "Distinct",
        "fnName": "distinct",
        "arrayOfFields": [{
            "type": "column",
            "name": "Columns",
            "fieldClass": "cols",
            "typeCheck": {
                "multiColumn": true,
                "columnType": ["string", "number", "boolean"]
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
    },
    {
        "buttonText": "Count Distinct",
        "fnName": "countDistinct",
        "arrayOfFields": [{
            "type": "column",
            "name": "Columns",
            "fieldClass": "cols",
            "typeCheck": {
                "multiColumn": true,
                "columnType": ["string", "number", "boolean"]
            }
        },
        {
            "type": "string",
            "name": "Aggregate Name",
            "fieldClass": "aggName",
            "typeCheck": {
                "allowEmpty": true,
                "newAggName": true
                // same conditions for aggregate and table names
            }
        }]
    },
    {
        "buttonText": "Group By Count Distinct",
        "fnName": "groupByCountDistinct",
        "arrayOfFields": [{
            "type": "column",
            "name": "Count Distinct Columns",
            "fieldClass": "distinctCols",
            "typeCheck": {
                "multiColumn": true,
                "columnType": ["string", "number", "boolean"]
            }
        },
        {
            "type": "column",
            "name": "Group By Columns",
            "fieldClass": "groupByCols",
            "typeCheck": {
                "multiColumn": true,
                "columnType": ["string", "number", "boolean"]
            }
        },
        {
            "type": "string",
            "name": "Resultant Column Name",
            "fieldClass": "finalColumnName",
            "typeCheck": {
                "allowEmpty": true,
                "newColumnName": true
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

    UExtDistinct.actionFn = function(functionName) {

        switch (functionName) {
            case "distinct":
                return distinct();
            case "countDistinct":
                return countDistinct();
            case "groupByCountDistinct":
                return groupByCountDistinct();
            default:
                return null;
        }
    };

    /*
    distinct: Returns a table with distinct records with respect to the columns
        provided.
    */
    function distinct() {
        var ext = new XcSDK.Extension();

        ext.start = function() {
            var deferred = XcSDK.Promise.deferred();

            var self = this;

            var args = self.getArgs();
            var srcTableName = ext.getTriggerTable().getName();
            var cols = args.cols;
            var finalTableName = args.finalTableName;
            var colNames = cols.map(function(col) {
                return col.getName();
            });

            var countColumn = ext.createUniqueCol(srcTableName, "Count");
            var options = {"clean": true};
            if (finalTableName) {
                options.newTableName = ext.createTableName(null, null,
                    finalTableName);
            }
            // perform a groupBy on provided columns to get a table with only
            // unique records with respect to those coumns
            ext.groupBy(XcSDK.Enums.AggType.Count, colNames, colNames[0],
                srcTableName, countColumn, options)
            .then(function(ret) {
                const tableAfterGroupBy = ret.dstTable;
                // hide the count column created by the group by and add table
                // to worksheet
                var table = ext.getTable(tableAfterGroupBy);
                table.deleteCol(new XcSDK.Column(countColumn));
                return table.addToWorksheet();
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }

    /*
    countDistinct: Returns the number of distinct records with respect to the
        columns provided.
    */
    function countDistinct() {
        var ext = new XcSDK.Extension();

        ext.start = function() {
            var deferred = XcSDK.Promise.deferred();

            var self = this;

            var args = self.getArgs();
            var srcTableName = ext.getTriggerTable().getName();
            var cols = args.cols;
            var aggName = args.aggName;
            var colNames = cols.map(function(col) {
                return col.getName();
            });

            var countColumn = ext.createUniqueCol(srcTableName, "Count");
            var options = {
                "clean": true,
                "newTableName": ext.createTempTableName()
            };
            // perform a groupBy on provided columns to get a table with only
            // unique records with respect to those coumns
            ext.groupBy(XcSDK.Enums.AggType.Count, colNames, colNames[0],
                srcTableName, countColumn, options)
            .then(function(ret) {
                const tableAfterGroupBy = ret.dstTable;
                // count the number of records present in the table
                return ext.aggregate(XcSDK.Enums.AggType.Count, countColumn,
                    tableAfterGroupBy, aggName);
            })
            .then(function(ret) {
                const uniqueRowsCount = ret.value;
                // display alert like in actual aggregates
                var colStr;
                if (colNames.length > 1) {
                    colStr = 'the columns "' + colNames + '". ';
                } else {
                    colStr = 'column "' + colNames + '". ';
                }
                Alert.show({
                    "title": "AGGREGATE: DISTINCT",
                    "instr": "This is the aggregate result for " + colStr +
                        "The aggregate operation is \"distinct\".",
                    "msg": '{"Value":' + uniqueRowsCount + "}",
                    "isAlert": true
                });
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }

    /*
    groupByCountDistinct: Calculates the number of distinct records with respect to
        'distinctCols', occuring with each distinct value of a different set of
        columns, called 'groupByCols'.
    */
    function groupByCountDistinct() {
        var ext = new XcSDK.Extension();

        ext.beforeStart = function () {
            var self = this;

            var args = self.getArgs();
            var groupByCols = args.groupByCols;
            var finalColumnName = args.finalColumnName;

            if (finalColumnName) {
                var derivedGroupByNames = {};
                groupByCols.forEach(function(col) {
                    // obtain the names of columns after the groupby's, and
                    // ensure finalColumnName does not clash
                    var splitName = col.getName().split("::");
                    var derivedName = splitName[splitName.length - 1];
                    derivedGroupByNames[derivedName] = true;
                });
                if (derivedGroupByNames.hasOwnProperty(finalColumnName)) {
                    return XcSDK.Promise.reject("'Resultant Column Name' cannot "
                        + "be the same as the non-prefix name of any of the " +
                        "columns in 'Group By Columns'");
                }
            }

            return XcSDK.Promise.resolve();
        };

        ext.start = function() {
            var deferred = XcSDK.Promise.deferred();

            var self = this;

            var args = self.getArgs();
            var srcTableName = ext.getTriggerTable().getName();
            var distinctCols = args.distinctCols;
            var groupByCols = args.groupByCols;
            // the default name, if the user does not provide one, is the
            // srcTableName with "-GBCD" (Group By Count Distinct) appended.
            var finalTableName = args.finalTableName ||
                (ext.tableNameRoot + "-GBCD");
            var finalColumnName = args.finalColumnName;
            var distinctColNames = distinctCols.map(function(col) {
                return col.getName();
            });
            var groupByColNames = groupByCols.map(function(col) {
                return col.getName();
            });

            var allColNamesObj = {};
            groupByColNames.forEach(function(colName){
                allColNamesObj[colName] = true;
            });
            distinctColNames.forEach(function(colName) {
                allColNamesObj[colName] = true;
            });
            // this contains all columns provided, whether they are in
            // distinctCols or groupByCols.
            var allColNames = Object.keys(allColNamesObj);

            var firstCountCol = ext.createUniqueCol(srcTableName, "temp");
            var options = {
                "clean": true,
                "newTableName": ext.createTempTableName()
            };
            // perform a groupBy on all columns, so that the resultant table
            // has only unique records with respect to all provided columns
            ext.groupBy(XcSDK.Enums.AggType.Count, allColNames, allColNames[0],
                srcTableName, firstCountCol, options)
            .then(function(ret) {
                const tableAfterGroupBy = ret.dstTable;
                const gByTableCols = ret.dstColumnsSDK;
                // perform a groupBy on only the groupBy columns. Since no two
                // records in this table are exactly the same, a simple count
                // operation will provide the number of distinct records with
                // respect to all remaining columns, i.e. distinctCols.
                var modifiedGByColNames = [];
                for (var i = 1; i <= groupByCols.length; i++) {
                    // get the modified names of the provided groubByCols after
                    // the first group by. Start from (i = 1) because the first
                    // column (i = 0) is the column created by the aggregate
                    var colName = gByTableCols[i].getName();
                    modifiedGByColNames[i - 1] = colName;
                }

                var countColumn = finalColumnName ||
                    ext.createUniqueCol(srcTableName, "DistinctCount");
                var opt = {
                    "clean": true,
                    "newTableName": ext.createTableName(null, null,
                        finalTableName)
                };
                return ext.groupBy(XcSDK.Enums.AggType.Count, modifiedGByColNames,
                    firstCountCol, tableAfterGroupBy, countColumn, opt);
            })
            .then(function(ret) {
                const finalTable = ret.dstTable;
                var table = ext.getTable(finalTable);
                return table.addToWorksheet();
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }

    return UExtDistinct;
}({}));