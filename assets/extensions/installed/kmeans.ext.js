// Every extension must be named UExt<EXTENSIONNAME>
// Every extension must be named after the file which will be
// <EXTENSIONNAME>.ext.js
// Extensions are case INSENSITIVE
// Every extension must have 3 functions:
// buttons
// actionFn
// undoActionFn
// buttons must return an array of structs. each struct must have a field
// called "buttonText" which populates the text in the button
// each struct must have a fnName field which contains the name of the function
// that will be triggered
// each struct must also have a field called arrayOfFields that is an array of
// requirements for each of the arguments that must be passed into the struct
// actionFn is a function that will get invoked once the user presses any of
// the buttons belonging to the extension
// undoActionFn is a function that will get invoked once the user tries to undo
// an action that belongs to this extension
window.UExtKMeans = (function(UExtKMeans, $) {
    UExtKMeans.buttons = [
        {"buttonText": "K-Means Clustering",
         "fnName": "kMeans",
         "arrayOfFields": [{"type": "number",
                            "name": "Number of clusters",
                            "fieldClass": "k"},
                           {"type": "number",
                            "name": "Threshold",
                            "fieldClass": "threshold"},
                           {"type": "number",
                            "name": "Max Iterations",
                            "fieldClass": "maxIter"},
                           ]
        }
    ];
    UExtKMeans.undoActionFn = undefined;
    UExtKMeans.actionFn = function(colNum, tableId, functionName, argList) {
        var table = gTables[tableId];
        var colName = table.tableCols[colNum - 1].getBackColName();
        var tableName = table.tableName;
        var tableNameRoot = tableName.split("#")[0];
        switch (functionName) {
        case ("kMeans"):
            // colName should be the column you want to cluster
            // This will generate a bunch of tables. The the most important
            // one is the last table which has the final cluster column
            kMeans(colName, tableName, argList["k"],
                   argList["threshold"], argList["maxIter"]
                  );
            break;
        default:
            break;
        }

        function kMeans(colName, tableName, k, threshold, maxIter) {
            if (verbose) {
                console.log("Starting K-Means");
            }
            // Steps:
            // INIT:
            // Step 1: Lock the table and start the transaction
            // Step 2: Pick the initial means by taking the first 'k' values
            // Step 3: Kick off the first iteration

            // CLUSTERING: Steps 4-10 are repeated until all of the means do not
            // change more than 'threshold' amount
            // Step 4: Construct table names and evalString from iteration count
            // Step 5: Map each datapoint to its closest mean, returning a clusterId column
            // Step 6: Index on the clusterId column for groupBy
            // Step 7: Group each clusterId by the average of it's datapoints
            // Step 8: Order the clusterIds for comparison
            // Step 9: Pull the new averages from ordered table
            // Step 10: Compare old and new averages, check for exit condition

            // FINAL:
            // Step 11: Pick out the columns you want to show from final iteration table
            // Step 12: Add the final iteration table to the workSheet
            // Step 13: Unlock the table and end the transaction

            // GLOBAL VARIABLES
            var clusterMeans = []; // keeps track of k means
            var clusterTableName;     // stores current iteration table name
            var clusterColName;       // stores current iteration column name

            // INIT:
            // Step 1: Lock the table and start the transaction
            var deferred = jQuery.Deferred();
            var tableId = xcHelper.getTableId(tableName);
            var table = gTables[tableId];
            var workSheet = WSManager.getWSFromTable(tableId);
            var resultSet;

            var txId = Transaction.start({
                msg: "KMeans: k:" + k + " threshold:" + threshold,
                operation: "KMeans",
                sql: null
            });
            xcHelper.lockTable(tableId);
            // Step 2: Pick the initial means by taking the first 'k' values
            // Use a result set to view the table and use the first 'k'
            // values as the initial means
            XcalarMakeResultSetFromTable(tableName)
            .then(function(res) {
                resultSet = res;
                return XcalarGetNextPage(resultSet.resultSetId, k);
            })
            .then(function(getPageOut) {
                for (var i = 0; i < k; i++) {
                    var value = jQuery.parseJSON(getPageOut.kvPair[i].value)[colName];
                    clusterMeans.push(value);
                }
                XcalarSetFree(resultSet.resultSetId);
            })
            .then(function() {
                // Step 3: Kick off the first iteration
                return iterate(0);
            })
            .then(function() {
                // FINAL:
                // Step 11: Pick out the columns you want to show from
                // final iteration table

                var finalTableId = xcHelper.getTableId(clusterTableName);
                var finalCols = [];

                // original columns
                finalCols[0] = table.getProgCol(colName);

                // clusterId column
                finalCols[1] = ColManager.newPullCol(clusterColName, "integer");

                // DATA column
                finalCols[2] = ColManager.newDATACol();

                // Step 12: Add the final iteration table to the workSheet
                return TblManager.refreshTable([clusterTableName], finalCols,
                                               [], workSheet);
            })
            .then(function() {
                // Step 13: Unlock the table and end the transaction
                xcHelper.unlockTable(tableId);
                Transaction.done(txId, {
                    msgTable: xcHelper.getTableId(xcHelper.getTableId(clusterTableName))
                });
                deferred.resolve();
            }).fail(function(error) {
                // FAILURE
                xcHelper.unlockTable(tableId);
                Transaction.fail(txId, {
                    failMsg: "KMeans failed",
                    error: error
                });
                deferred.reject(error);
            });

            return deferred.promise();

            function iterate(iteration) {
                // CLUSTERING: this is a recursive do-while construct.
                return (oneIter(iteration)
                        .then(function(done) {
                            if ((!maxIter || iteration < maxIter) &&
                                done == false) {
                                return iterate(iteration + 1);
                            }
                        }));
            }

            function oneIter(iteration) {
                var innerDeferred = jQuery.Deferred();
                var resultSet;

                // evalString for clustering function
                var mapStr;

                // need to index on cluster column before we groupBy
                var indexTableName;

                // result of groupBy on cluster column
                var groupTableName;
                var groupColName = "means";

                // need to put cluster ids in order for comparison
                var sortGroupTableName;

                // set to false when a cluster doesn't meet threshold criteria
                var done = true;

                // Step 4: Construct table names and evalString from iteration count
                clusterTableName = "iter_" + iteration + "_" + tableNameRoot +
                    Authentication.getHashId();
                clusterColName = "iter_" + iteration;

                indexTableName = "index_" + iteration + "_" + tableNameRoot +
                    Authentication.getHashId();
                groupTableName = "group_" + iteration + "_" + tableNameRoot +
                    Authentication.getHashId();
                sortGroupTableName = "sortGroup_" + iteration + "_" + tableNameRoot +
                    Authentication.getHashId();

                // Pass clusterMeans as a string of means seperated by commas
                // Need to cast resulting cluster id to int for sorting
                mapStr = "int(kmeans:cluster(" + colName + ",\"";
                for (var i = 0; i < k; i++) {
                    mapStr += clusterMeans[i];
                    if (i != k - 1) {
                        mapStr += ",";
                    }
                }
                mapStr += "\"))";

                // Step 5: Map each datapoint to it's closest mean,
                // returning a clusterId column
                XcalarMap(clusterColName, mapStr, tableName,
                          clusterTableName, txId, false)
                .then(function() {
                    // Step 6: Index on the clusterId column for groupBy
                    return (XcalarIndexFromTable(clusterTableName, clusterColName,
                                                 indexTableName,
                                                 XcalarOrderingT.XcalarOrderingUnordered,
                                                 txId, true));
                })
                .then(function() {
                    // Step 7: Group each clusterId by the average of it's datapoints
                    return (XcalarGroupBy(AggrOp.Avg, groupColName, colName,
                                          indexTableName, groupTableName,
                                          false, txId));
                })
                .then(function() {
                    // Step 8: Order the clusterIds for comparison
                    return (XcalarIndexFromTable(groupTableName, clusterColName,
                                                 sortGroupTableName,
                                                 XcalarOrderingT.XcalarOrderingAscending,
                                                 txId, false));
                })
                .then(function() {
                    // Step 9: Pull the new averages from ordered table
                    return (XcalarMakeResultSetFromTable(sortGroupTableName));
                })
                .then(function(res) {
                    resultSet = res;
                    return (XcalarGetNextPage(resultSet.resultSetId, k));
                })
                .then(function(out) {
                    // Step 10: Compare old and new averages, check for exit condition
                    for (var i = 0; i < out.numKvPairs; i++) {
                        var avg = jQuery.parseJSON(out.kvPair[i].value)[groupColName];
                        if (Math.abs(avg - clusterMeans[i]) > threshold) {
                            done = false;
                            clusterMeans[i] = avg;
                        }
                    }
                    XcalarSetFree(resultSet.resultSetId);
                    innerDeferred.resolve(done);
                })
                .fail(innerDeferred.reject);

                return (innerDeferred.promise());
            }
        };
    };
    return (UExtKMeans);
}({}, jQuery));
