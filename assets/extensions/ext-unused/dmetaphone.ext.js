// module name must start with "UExt"
window.UExtDmetaphone = (function(UExtDmetaphone) {
    UExtDmetaphone.buttons = [{
        "buttonText": "Clustering",
        "fnName": "dMetaphone",
        "arrayOfFields": [{
            "type": "column",
            "name": "Column To Clustering",
            "fieldClass": "clusterCol",
            "autofill": true,
            "typeCheck": {
                "columnType": ["string"]
            }
        },
        {
            "type": "string",
            "name": "New Columns Name",
            "fieldClass": "newCol",
            "typeCheck": {
                "newColumnName": true
            }
        }],
    }];

    UExtDmetaphone.actionFn = function(functionName) {
        // it's a good convention to use switch/case to handle
        // different function in the extension and handle errors.
        switch (functionName) {
            case "dMetaphone":
                return dMetaphone();
            default:
                return null;
        }
    };

    function dMetaphone() {
        var ext = new XcSDK.Extension();
        /*
         * steps:
         *  1. map t0 with genMetaphone UDF (newCol: metaphone) -> t1
         *  2. group t1 on clusterCol,
         *     count clusterCol (newCol: clusterCol_count),
         *     include sample (select metaphone) -> t2
         *  3.1. group t2 on metaphone, max clusterCol_count(max) -> t3
         *  3.2 join t3 back to t2 on metaphone, max_count -> t4
         *  3.3 group by t4 on metaphone, include sample culsterCol -> t5
         *  4. t4 rename clusterCol col to newColName -> t5
         *  5. project t4 to have only metaphone, newColName -> t6
         *  6. join t6 back with t1 on metaphone -> t7,
         *     this is the final table and newColName on t7 is the result.
         */

        ext.start = function() {
            var deferred = XcSDK.Promise.deferred();
            var self = this;
            var args = self.getArgs();

            var srcTable = self.getTriggerTable();
            var srcTableName = srcTable.getName();
            var clusterCol = args.clusterCol;
            var clusterColName = args.clusterCol.getName();
            var newColName = args.newCol;
            var countClusterColName;
            var lTableToJoin;

            // step 1: map t0 with genMetaphone UDF (newCol: metaphone) -> t1
            var mapStr = "dmetaphone:genMetaphone(" + clusterColName + ")";
            var metaphoneCol = ext.createUniqueCol(srcTableName, "metaphone",
                                                   true);
            var metaphoneTable = ext.createTempTableName();

            ext.map(mapStr, srcTableName, metaphoneCol, metaphoneTable)
            .then(function(tableAfterMap) {
                lTableToJoin = tableAfterMap;
                // step 2 group t1 on clusterCol,
                // count clusterCol (newCol: clusterCol_count),
                // include sample (select metaphone) -> t2

                var operator = XcSDK.Enums.AggType.Count;
                countClusterColName = clusterCol.getParsedName() + "_count";
                countClusterColName = ext.createUniqueCol(srcTableName,
                                                          countClusterColName,
                                                          true);
                var options = {
                    "isIncSample": true,
                    "clean": true,
                    "newTableName": ext.createTempTableName()
                };
                return ext.groupBy(operator, [clusterColName], clusterColName,
                                   tableAfterMap, countClusterColName, options);
            })
            .then(function(tableAfterGroupby) {
                // step 3
                return conditionalGroupby(ext, tableAfterGroupby,
                                          metaphoneCol, countClusterColName);
            })
            .then(function(tableAfterGroupby) {
                // step 4 t4 rename clusterCol col to newColName -> t5
                var castStr = clusterCol.getTypeForCast() + "(" +
                              clusterColName + ")";
                return ext.map(castStr, tableAfterGroupby,
                               newColName, ext.createTempTableName());
            })
            .then(function(tableAfterMap) {
                // step 5. project t4 to have only metaphone, newColName -> t6
                return ext.project([metaphoneCol, newColName], tableAfterMap,
                                    ext.createTempTableName());
            })
            .then(function(tableAfterProject) {
                // step 6. join t6 back with t1 on metaphone -> t7,
                var joinType = XcSDK.Enums.JoinType.InnerJoin;
                var suffix = ext.createColumnName();
                var lTableInfo = {
                    "tableName": lTableToJoin,
                    "columns": [metaphoneCol]
                };
                var rename = ext.getJoinRenameMap(metaphoneCol,
                                                  metaphoneCol + "_" + suffix);
                var rTableInfo = {
                    "tableName": tableAfterProject,
                    "columns": [metaphoneCol],
                    "rename": [rename]
                };
                var joinOpts = {
                    "clean": true,
                    "newTableName": ext.createTableName()
                };
                return ext.join(joinType, lTableInfo, rTableInfo, joinOpts);
            })
            .then(function(finalTable) {
                // usually for the final table,
                // you want to customerize it's columns and display it
                // see tableApi.js and columnApi.js for more details
                var table = ext.getTable(finalTable);
                table.deleteAllCols();
                srcTable.getColNamesAsArray().forEach(function(colName) {
                    if (colName === "DATA") {
                        return true;
                    } else {
                        table.addCol(new XcSDK.Column(colName));
                        if (colName === clusterColName) {
                            table.addCol(new XcSDK.Column(newColName));
                        }
                    }
                });

                return table.addToWorksheet(srcTableName);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };
        return ext;
    }

    function conditionalGroupby(ext, srcTable, groupByCol, aggCol) {
        var deferred = XcSDK.Promise.deferred();

        var operator = XcSDK.Enums.AggType.MaxInteger;
        var suffix = ext.createColumnName();
        var newColName = "max_count_" + suffix;
        var options = {
            "newTableName": ext.createTempTableName(),
            "clean": true
        };

        //  3.1. group t2 on metaphone, max clusterCol_count -> t3
        ext.groupBy(operator, [groupByCol], aggCol,
                    srcTable, newColName, options)
        .then(function(tableAfterGroupby) {
            // 3.2 join join t3 back to t2 on metaphone, max_count -> t4
            var joinType = XcSDK.Enums.JoinType.InnerJoin;
            var lTableInfo = {
                "tableName": srcTable,
                "columns": [aggCol, groupByCol]
            };
            var rename = ext.getJoinRenameMap(groupByCol,
                                              groupByCol + "_" + suffix);
            var rTableInfo = {
                "tableName": tableAfterGroupby,
                "columns": [newColName, groupByCol],
                "rename": [rename]
            };
            var joinOpts = {
                "clean": true,
                "newTableName": ext.createTempTableName()
            };
            return ext.join(joinType, lTableInfo, rTableInfo, joinOpts);
        })
        .then(function(tableAfterJoin) {
            // 3.3 group by t4 on metaphone, include sample culsterCol -> t5
            operator = XcSDK.Enums.AggType.Count;
            newColName = operator.toLowerCase() + "_" + suffix;
            options = {
                "isIncSample": true,
                "newTableName": ext.createTempTableName(),
                "clean": true
            };

            return ext.groupBy(operator, [groupByCol], aggCol,
                               tableAfterJoin, newColName, options);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    return UExtDmetaphone;
}({}));