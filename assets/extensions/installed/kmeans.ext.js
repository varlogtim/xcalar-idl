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
    UExtKMeans.buttons = [{
        "buttonText"   : "K-Means Clustering",
        "fnName"       : "kMeans",
        "arrayOfFields": [{
            "type"      : "number",
            "name"      : "Number of clusters",
            "fieldClass": "k"
        },
        {
            "type"      : "number",
            "name"      : "Threshold",
            "fieldClass": "threshold"
        },
        {
            "type"      : "number",
            "name"      : "Max Iterations",
            "fieldClass": "maxIter"
        }]
    }];
    UExtKMeans.undoActionFn = undefined;
    UExtKMeans.actionFn = function(txId, colList, tableId, functionName, argList) {
        var table = gTables[tableId];
        var colNames = [];
        var tableName = table.tableName;
        var tableNameRoot = tableName.split("#")[0];
        // all temporary tables will have this tag appended in tableName
        var tmpTableTag = "_" + tableNameRoot + "_" + "kMeansTmpTable";

        switch (functionName) {
            case ("kMeans"):
                // XXX later should change this as an input filed in modal
                if (typeof(colList) == "number") {
                    var col = table.tableCols[colList - 1];
                    if (col.type != "integer" && col.type != "float") {
                        return PromiseHelper.reject("Column must be a number");
                    }
                    colNames.push(col.getBackColName());
                } else {
                    for (var i = 0; i < colList.length; i++) {
                        var col = table.tableCols[colList[i] - 1];
                        if (col.type != "integer" && col.type != "float") {
                            return PromiseHelper.reject("Column must be a number");
                        }
                        colNames.push(col.getBackColName());
                    }
                }
                if (colList.length && colNames.length != colList.length) {
                    return PromiseHelper.reject("Invalid arguments");
                }
                return kMeansStart(txId, colNames, tableName, argList["k"],
                            argList["threshold"], argList["maxIter"]
                           );
            default:
                return PromiseHelper.reject("Invalid Function");
        }

        function kMeansStart(txId, colNames, tableName, k, threshold, maxIter) {
            if (verbose) {
                console.log("Starting K-Means");
            }
            // Steps:
            // Step 1: INIT
            // Step 2: Map given element cols into a stringified vector

            // Step 3: Calculate initial centroids
            // Step 3a: Map random clusters to each of the vectors
            // Step 3b: Index on the cluster col
            // Step 3c: GroupBy avg(elem) for each of the elements
            // Step 3d: Join the resulting groupBy tables
            // Step 3e: Map the element avgs into stringified centroids


            // CLUSTERING: Repeats steps 4-8 until exit condition is reached
            // Step 4: Startup
            // Step 4a: Assign table names for this iteration
            // Step 4b: Drop all temporaries from the previous iteration

            // Step 5: Cluster assignment
            // Step 5a: Sort the previous centroids
            // Step 5b: Map a delimiter onto the end of each centroid
            // Step 5c: Aggregate the delimited centroids into one large string
            // Step 5d: Map each input vector to its closest cluster

            // Step 6: Centroid update
            // Step 6a: Map each input vector to its seperate elements
            // Step 6b: Index on the cluster column
            // Step 6c: GroupBy avg(elem) for each of the elements
            // Step 6d: Join the resulting groupBy tables
            // Step 6e: Map the element avgs into stringified centroids

            // Step 7: Exit Condition
            // Step 7a: Join the previous centroids with the current centroids
            // Step 7b: Map each pair of centroids to its distance
            // Step 7c: View the distance table
            // Step 7d: Check if any of the distances are above threshold

            // Step 8: Cleanup
            // Step 8a: Free the result set
            // Step 8b: Re-assign previous iteration information
            // Step 8c: Return whether or not we have reached the exit condition


            // FINAL:
            // Step 10: Display the final cluster assignment table
            // Step 11: Display the final centroid table

            ////////////////////////////////////////////////////////////////////////////

            // Step 1: INIT
            var outerDeferred = jQuery.Deferred();
            var tableId = xcHelper.getTableId(tableName);
            var table = gTables[tableId];
            var workSheet = WSManager.getWSFromTable(tableId);


            // Step 2: Map given element cols into a stringified vector
            var dstColName = "kMeansVector";
            var dstTableName = "kMeansTable_" + tableNameRoot +
                Authentication.getHashId();
            var numElems = colNames.length;
            var mapStr = 'kmeans:stringifyVector(';
            for (var i = 0; i < numElems; i++) {
                mapStr += colNames[i];
                if (i != numElems - 1) {
                    mapStr += ',';
                }
            }
            mapStr += ')';
            XcalarMap(dstColName, mapStr, tableName,
                      dstTableName, txId, false)
            .then(function() {
                // perform kMeans on stringified vector column
                return(kMeans(dstColName, colNames, dstTableName,
                              k, threshold, maxIter,
                              tableId, txId, workSheet));
            })
            .then(function(centroidTableName) {
                outerDeferred.resolve(centroidTableName);
            })
            .fail(outerDeferred.reject);

            return (outerDeferred.promise());
        }

        // This function performs kMeans on a column with stringified vectors
        function kMeans(vectorColName, elemNames, tableName, k, threshold, maxIter,
                        tableId, txId, workSheet) {
            // GLOBAL VARIABLES
            var centroidTableName = "";
            var centroidColName = "";
            var clusterColName = "";
            var numElems = elemNames.length;

            var clusterTableName = "clusters_0_" + tableNameRoot +
                Authentication.getHashId();
            var prevClusterColName = "iter_0";
            var prevCentroidColName = "centroids_0";
            var prevCentroidTableName = "centroids_0_" + tableNameRoot +
                Authentication.getHashId();

            var deferred = jQuery.Deferred();

            // Step 3: Calculate initial centroids
            // Step 3a: Map random clusters to each of the vectors
            XcalarMap(prevClusterColName, 'int(kmeans:randCluster(' + (k-1) + '))',
                      tableName, clusterTableName, txId, false)
            .then(function() {
                var queryStr = "";
                var indexTableName = "index_findCentroid" + tmpTableTag +
                    Authentication.getHashId();

                // Step 3b: Index on the cluster col
                queryStr += 'index --key ' + prevClusterColName +
                    ' --srctable ' + clusterTableName +
                    ' --dsttable ' + indexTableName + ';';

                // Step 3c: GroupBy avg(elem) for each of the elements
                var avgFieldNames = [];
                var avgTableNames = [];
                for (var i = 0; i < numElems; i++) {
                    avgFieldNames.push(elemNames[i] + "_avg");
                    avgTableNames.push("avg_findCentroid_" + i + tmpTableTag +
                                       Authentication.getHashId());
                    queryStr += 'groupBy --eval "avg(' + elemNames[i] +
                        ')" --fieldName ' + avgFieldNames[i] +
                        ' --srctable ' + indexTableName +
                        ' --dsttable ' + avgTableNames[i] + ';';
                }

                // Step 3d: Join the resulting groupBy tables
                var joinTableNames = [avgTableNames[0]];
                for (var i = 0; i < numElems - 1; i++) {
                    joinTableNames.push("join_findCentroid_" + i + tmpTableTag +
                                        Authentication.getHashId());
                    queryStr += 'join --leftTable ' + joinTableNames[i] +
                        ' --rightTable ' + avgTableNames[i+1] +
                        ' --joinTable ' + joinTableNames[i+1] + ';';
                }

                // Step 3e: Map the element avgs into stringified centroids
                queryStr += 'map --eval "kmeans:stringifyVector(';
                for (var i = 0; i < numElems; i++) {
                    queryStr += avgFieldNames[i];
                    if (i != numElems - 1) {
                        queryStr += ',';
                    }
                }
                queryStr += ')" --fieldName ' + prevCentroidColName +
                    ' --srctable ' + joinTableNames[joinTableNames.length - 1] +
                    ' --dsttable ' + prevCentroidTableName + ';';

                // submit query we created
                return (XcalarQueryWithCheck("findCentroid_" + tmpTableTag +
                                             Authentication.getHashId(),
                                             queryStr));
            })
            .then(function() {
                // CLUSTERING: this is a recursive do-while construct
                return iterate(1);
            })
            .then(function() {
                // FINAL:
                // Step 10: Display the final cluster assignment table
                var finalTableId = xcHelper.getTableId(clusterTableName);
                var finalCols = [];

                // original elements in stringified vector form
                finalCols[0] = ColManager.newPullCol(vectorColName, "string");

                // clusterId column
                finalCols[1] = ColManager.newPullCol(clusterColName, "integer");

                // DATA column
                finalCols[2] = ColManager.newDATACol();

                return TblManager.refreshTable([clusterTableName], finalCols,
                                               [], workSheet);
            })
            .then(function() {
                // Step 11: Display the final centroid table
                var finalTableId = xcHelper.getTableId(centroidTableName);
                var finalCols = [];

                // centroids in stringified vector form
                finalCols[0] = ColManager.newPullCol(centroidColName, "string");

                // clusterId column
                finalCols[1] = ColManager.newPullCol(clusterColName, "integer");

                // DATA column
                finalCols[2] = ColManager.newDATACol();

                return TblManager.refreshTable([centroidTableName], finalCols,
                                               [], workSheet);
            })
            .then(function() {
                deferred.resolve(centroidTableName);
            })
            .fail(deferred.reject);

            return deferred.promise();

            function iterate(iteration) {
                return (oneIter(iteration)
                        .then(function(done) {
                            if ((!maxIter || iteration < maxIter) &&
                                done === false) {
                                return iterate(iteration + 1);
                            }
                        }));
            }

            function oneIter(iteration) {
                var innerDeferred = jQuery.Deferred();
                var resultSet;
                // set to false when a centroid doesn't meet threshold criteria
                var done = true;

                // Step 4: Startup
                // Step 4a: Assign table names for this iteration
                clusterTableName = "iter_" + iteration + "_" + tableNameRoot +
                    Authentication.getHashId();
                centroidTableName = "centroids_" + tableNameRoot +
                    Authentication.getHashId();
                clusterColName = "iter_" + iteration;
                centroidColName = "centroids_" + iteration;

                // Step 4b: Drop all temporaries from the previous iteration
                var startupStr =
                    'drop table *' + tmpTableTag + '*;' +
                    'drop constant *' + tmpTableTag + '*;';


                // Step 5: Cluster assignment
                var centroidTableSorted = "sorted_centroids_" + iteration + tmpTableTag +
                    Authentication.getHashId();
                var concatDelimTable = "concat_" + iteration + tmpTableTag +
                    Authentication.getHashId();
                var concatDelimCol = "concat_" + iteration;
                var clusterCentroids = "centroids_" + iteration + tmpTableTag +
                    Authentication.getHashId();
                clusterStr =
                    // Step 5a: Sort the previous centroids
                    'index --sorted --key ' + prevClusterColName +
                    ' --srctable ' + prevCentroidTableName +
                    ' --dsttable ' + centroidTableSorted + ';' +

                // Step 5b: Map a delimiter onto the end of each centroid
                'map --eval "concat(' + prevCentroidColName + ',\\"#\\")"' +
                    ' --fieldName ' + concatDelimCol +
                    ' --srctable ' + prevCentroidTableName +
                    ' --dsttable ' + concatDelimTable + ';' +

                // Step 5c: Aggregate the delimited centroids into one large string
                'aggregate --eval "listAgg(' + concatDelimCol + ')"' +
                    ' --srctable ' + concatDelimTable +
                    ' --dsttable ' + clusterCentroids + ';' +

                // Step 5d: Map each input vector to its closest cluster
                'map --eval "int(kmeans:cluster(' + vectorColName +
                    ',@' + clusterCentroids + '))"' +
                    ' --fieldName ' + clusterColName +
                    ' --srctable ' + tableName +
                    ' --dsttable ' + clusterTableName + ';';


                // Step 6: Centroid update
                // Step 6a: Map each input vector to its seperate elements
                var splitStr = "";
                var elemFieldNames = [];
                var elemTableNames = [clusterTableName];
                for (var i = 0; i < numElems; i++) {
                    elemFieldNames.push("elem_" + i);
                    elemTableNames.push("elem_" + i + "_" + iteration + tmpTableTag +
                                        Authentication.getHashId());
                    splitStr += 'map --eval "float(cut(' + vectorColName + ',' +
                        (i+1) + ',\\",\\"))" --fieldName ' + elemFieldNames[i] +
                        ' --srctable ' + elemTableNames[i] +
                        ' --dsttable ' + elemTableNames[i+1] + ';';
                }

                // Step 6b: Index on the cluster column
                var indexTableName = "index_" + iteration + tmpTableTag +
                    Authentication.getHashId();
                var groupStr = 'index --key ' + clusterColName +
                    ' --srctable ' + elemTableNames[numElems] +
                    ' --dsttable ' + indexTableName + ';';

                // Step 6c: GroupBy avg(elem) for each of the elements
                var avgFieldNames = [];
                var avgTableNames = [];
                for (var i = 0; i < numElems; i++) {
                    avgFieldNames.push("avg_" + i);
                    avgTableNames.push("avg_" + i + "_" + iteration + tmpTableTag +
                                       Authentication.getHashId());
                    groupStr += 'groupBy --eval "avg(' + elemFieldNames[i] +
                        ')" --fieldName ' + avgFieldNames[i] +
                        ' --srctable ' + indexTableName +
                        ' --dsttable ' + avgTableNames[i] + ';';
                }

                // Step 6d: Join the resulting groupBy tables
                var joinStr = "";
                var joinTableNames = [avgTableNames[0]];
                for (var i = 0; i < numElems - 1; i++) {
                    joinTableNames.push("join_" + i + "_" + iteration + tmpTableTag +
                                        Authentication.getHashId());
                    joinStr += 'join --leftTable ' + joinTableNames[i] +
                        ' --rightTable ' + avgTableNames[i+1] +
                        ' --joinTable ' + joinTableNames[i+1] + ';';
                }

                // Step 6e: Map the element avgs into stringified centroids
                var stringifyStr = 'map --eval "kmeans:stringifyVector(';
                for (var i = 0; i < numElems; i++) {
                    stringifyStr += avgFieldNames[i];
                    if (i != numElems - 1) {
                        stringifyStr += ',';
                    }
                }
                stringifyStr += ')" --fieldName ' + centroidColName +
                    ' --srctable ' + joinTableNames[joinTableNames.length - 1] +
                    ' --dsttable ' + centroidTableName + ';';
                // combine all parts into one string
                var updateStr = splitStr + groupStr + joinStr + stringifyStr;


                // Step 7: Exit Condition
                // Step 7a: Join the previous centroids with the current centroids
                var distanceField = "distance";
                var compareTableName = "compare_" + iteration + tmpTableTag +
                    Authentication.getHashId();
                var distanceTableName = "distance_" + iteration + tmpTableTag +
                    Authentication.getHashId();
                var compareStr = 'join --leftTable ' + prevCentroidTableName +
                    ' --rightTable ' + centroidTableName +
                    ' --joinTable ' + compareTableName + ';';

                // Step 7b: Map each pair of centroids to its distance
                compareStr += 'map --eval "float(kmeans:distance(' +
                    prevCentroidColName + ',' +
                    centroidColName + '))" --fieldName ' + distanceField +
                    ' --srctable ' + compareTableName +
                    ' --dsttable ' + distanceTableName;

                // Step 7c: View the distance table
                // need to run the query to view the result, submit the query here
                queryStr = startupStr + clusterStr + updateStr + compareStr;
                XcalarQueryWithCheck("kMeans_" + tableNameRoot +"_iteration_" +
                                     iteration + Authentication.getHashId(),
                                     queryStr)
                .then(function() {
                    return (XcalarMakeResultSetFromTable(distanceTableName));
                })
                .then(function(res) {
                    resultSet = res;
                    return (XcalarGetNextPage(resultSet.resultSetId, k));
                })
                .then(function(out) {
                    // Step 7d: Check if any of the distances are above threshold
                    for (var i = 0; i < out.numKvPairs; i++) {
                        var distance = jQuery.parseJSON(out.kvPair[i].value)[distanceField];
                        if (distance > threshold) {
                            done = false;
                        }
                    }


                    // Step 8: Cleanup
                    // Step 8a: Free the result set
                    XcalarSetFree(resultSet.resultSetId);

                    // Step 8b: Re-assign previous iteration information
                    prevCentroidTableName = centroidTableName;
                    prevCentroidColName = centroidColName;
                    prevClusterColName = clusterColName;

                    // Step 8c: Return whether or not we have reached the exit condition
                    innerDeferred.resolve(done);
                })
                .fail(innerDeferred.reject);

                return (innerDeferred.promise());
            }
        }
    };
    return (UExtKMeans);
}({}, jQuery));
