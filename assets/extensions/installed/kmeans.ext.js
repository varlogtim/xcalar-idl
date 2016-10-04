// Every extension must be named UExt<EXTENSIONNAME>
// Every extension must be named after the file which will be
// <EXTENSIONNAME>.ext.js
// Extensions are case INSENSITIVE
// Every extension must have 2 functions:
// buttons
// actionFn
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
window.UExtKMeans = (function(UExtKMeans) {
    UExtKMeans.buttons = [{
        "buttonText"   : "K-Means Clustering",
        "fnName"       : "kMeans",
        "arrayOfFields": [{
            "type"      : "column",
            "name"      : "KMeans Columns",
            "fieldClass": "cols",
            "autofill"  : true,
            "typeCheck" : {
                "columnType" : "number",
                "multiColumn": true
            }
        },
        {
            "type"      : "number",
            "name"      : "Number of clusters",
            "fieldClass": "k",
            "typeCheck" : {
                "integer": true,
                "min"    : 1
            }
        },
        {
            "type"      : "number",
            "name"      : "Threshold",
            "fieldClass": "threshold"
        },
        {
            "type"      : "number",
            "name"      : "Max Iterations",
            "fieldClass": "maxIter",
            "typeCheck" : {
                "integer": true,
                "min"    : 1
            }
        }]
    }];

    UExtKMeans.actionFn = function(funcName) {
        switch (funcName) {
            case ("kMeans"):
                var ext = new XcSDK.Extension();
                ext.start = kMeansStart;
                return ext;
            default:
                return null;
        }
    };

    function kMeansStart() {
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
        // Step 8a: Re-assign previous iteration information
        // Step 8b: Return whether or not we have reached the exit condition


        // FINAL:
        // Step 10: Display the final cluster assignment table
        // Step 11: Display the final centroid table

        ////////////////////////////////////////////////////////////////////////////

        // Step 1: INIT
        var deferred = XcSDK.Promise.deferred();
        var ext = this;
        var args = ext.getArgs();

        var colNames = args.cols.map(function(col) {
            return col.getName();
        });

        var table = ext.getTriggerTable();
        var tableName = table.getName();

        // Step 2: Map given element cols into a stringified vector
        var dstColName = "kMeansVector";
        var dstTableName = ext.createTableName("kMeansTable_");
        var mapStr = 'kmeans:stringifyVector(';

        for (var i = 0, numElems = colNames.length; i < numElems; i++) {
            mapStr += colNames[i];
            if (i !== numElems - 1) {
                mapStr += ',';
            }
        }
        mapStr += ')';

        ext.map(mapStr, tableName, dstColName, dstTableName)
        .then(function(tableAfterMap) {
            // perform kMeans on stringified vector column
            return kMeans(ext, dstColName, colNames, tableAfterMap);
        })
        .then(function(centroidTableName, clusterTableName) {
            deferred.resolve([centroidTableName, clusterTableName]);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // This function performs kMeans on a column with stringified vectors
    function kMeans(ext, vectorColName, elemNames, tableName) {
        var args = ext.getArgs();
        var k = args.k;
        var threshold = args.threshold;
        var maxIter = args.maxIter;

        // all temporary tables will have this tag appended in tableName
        var tmpTableTag = ext.createTableName("_", "_kMeansTmpTable");

        // GLOBAL VARIABLES
        var centroidTableName = "";
        var centroidColName = "";
        var clusterColName = "";
        var numElems = elemNames.length;

        var clusterTableName = ext.createTableName("clusters_0_");
        var prevClusterColName = "iter_0";
        var prevCentroidColName = "centroids_0";
        var prevCentroidTableName = ext.createTableName("centroids_0_");

        var deferred = XcSDK.Promise.deferred();

        // Step 3: Calculate initial centroids
        // Step 3a: Map random clusters to each of the vectors
        ext.map('mod(genUnique(),' + k + ')', tableName,
                prevClusterColName, clusterTableName)
        .then(function() {
            var queryStr = "";
            var indexTableName = ext.createTableName("index_findCentroid", null,
                                                    tmpTableTag);

            // Step 3b: Index on the cluster col
            queryStr += 'index --key ' + prevClusterColName +
                ' --srctable ' + clusterTableName +
                ' --dsttable ' + indexTableName + ';';

            // Step 3c: GroupBy avg(elem) for each of the elements
            var avgFieldNames = [];
            var avgTableNames = [];
            for (var i = 0; i < numElems; i++) {
                avgFieldNames.push(elemNames[i] + "_avg");
                avgTableNames.push(ext.createTableName("avg_findCentroid_" + i,
                                    null, tmpTableTag));
                queryStr += 'groupBy --eval "avg(' + elemNames[i] +
                    ')" --fieldName ' + avgFieldNames[i] +
                    ' --srctable ' + indexTableName +
                    ' --dsttable ' + avgTableNames[i] + ';';
            }

            // Step 3d: Join the resulting groupBy tables
            var joinTableNames = [avgTableNames[0]];
            for (var i = 0; i < numElems - 1; i++) {
                joinTableNames.push(ext.createTableName("join_findCentroid_" + i,
                                    null, tmpTableTag));
                queryStr += 'join --leftTable ' + joinTableNames[i] +
                    ' --rightTable ' + avgTableNames[i + 1] +
                    ' --joinTable ' + joinTableNames[i +1] + ';';
            }

            // Step 3e: Map the element avgs into stringified centroids
            queryStr += 'map --eval "kmeans:stringifyVector(';
            for (var i = 0; i < numElems; i++) {
                queryStr += avgFieldNames[i];
                if (i !== numElems - 1) {
                    queryStr += ',';
                }
            }
            queryStr += ')" --fieldName ' + prevCentroidColName +
                ' --srctable ' + joinTableNames[joinTableNames.length - 1] +
                ' --dsttable ' + prevCentroidTableName + ';';

            // submit query we created
            return ext.query(queryStr);
        })
        .then(function() {
            // CLUSTERING: this is a recursive do-while construct
            return iterate(1);
        })
        .then(function() {
            // FINAL:
            // Step 10: Display the final cluster assignment table
            var finalTable = ext.createNewTable(clusterTableName);
            // original elements in stringified vector form
            finalTable.addCol(new XcSDK.Column(vectorColName, "string"));
            // clusterId column
            finalTable.addCol(new XcSDK.Column(clusterColName, "integer"));

            return finalTable.addToWorksheet();
        })
        .then(function() {
            // Step 11: Display the final centroid table
            var finalTable = ext.createNewTable(centroidTableName);
            // centroids in stringified vector form
            finalTable.addCol(new XcSDK.Column(centroidColName, "string"));
            // clusterId column
            finalTable.addCol(new XcSDK.Column(clusterColName, "integer"));

            return finalTable.addToWorksheet();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();

        function iterate(iteration) {
            return oneIter(iteration)
                    .then(function(done) {
                        if ((!maxIter || iteration < maxIter) &&
                            done === false)
                        {
                            return iterate(iteration + 1);
                        }
                    });
        }

        function oneIter(iteration) {
            var innerDeferred = XcSDK.Promise.deferred();
            // set to false when a centroid doesn't meet threshold criteria
            var done = true;

            // Step 4: Startup
            // Step 4a: Assign table names for this iteration
            clusterTableName = ext.createTableName("iter_" + iteration + "_");
            centroidTableName = ext.createTableName("centroids_");
            clusterColName = "iter_" + iteration;
            centroidColName = "centroids_" + iteration;

            // Step 4b: Drop all temporaries from the previous iteration
            var startupStr = 'drop table *' + tmpTableTag + '*;' +
                             'drop constant *' + tmpTableTag + '*;';

            // Step 5: Cluster assignment
            var centroidTableSorted = ext.createTableName("sorted_centroids_" +
                                      iteration. null, tmpTableTag);
            var concatDelimTable = ext.createTableName("concat_" + iteration,
                                                        null, tmpTableTag);
            var concatDelimCol = "concat_" + iteration;
            var clusterCentroids = ext.createTableName("centroids_" + iteration,
                                                        null, tmpTableTag);
            var clusterStr =
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
                ',' + ext.getConstant(clusterCentroids) + '))"' +
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
                elemTableNames.push(ext.createTableName("elem_" + i + "_" +
                                    iteration, null, tmpTableTag));
                splitStr += 'map --eval "float(cut(' + vectorColName + ',' +
                    (i + 1) + ',\\",\\"))" --fieldName ' + elemFieldNames[i] +
                    ' --srctable ' + elemTableNames[i] +
                    ' --dsttable ' + elemTableNames[i + 1] + ';';
            }

            // Step 6b: Index on the cluster column
            var indexTableName = ext.createTableName("index_" + iteration,
                                                    null, tmpTableTag);
            var groupStr = 'index --key ' + clusterColName +
                ' --srctable ' + elemTableNames[numElems] +
                ' --dsttable ' + indexTableName + ';';

            // Step 6c: GroupBy avg(elem) for each of the elements
            var avgFieldNames = [];
            var avgTableNames = [];
            for (var i = 0; i < numElems; i++) {
                avgFieldNames.push("avg_" + i);
                avgTableNames.push(ext.createTableName("avg_" + i + "_" +
                                    iteration, null, tmpTableTag));
                groupStr += 'groupBy --eval "avg(' + elemFieldNames[i] +
                    ')" --fieldName ' + avgFieldNames[i] +
                    ' --srctable ' + indexTableName +
                    ' --dsttable ' + avgTableNames[i] + ';';
            }

            // Step 6d: Join the resulting groupBy tables
            var joinStr = "";
            var joinTableNames = [avgTableNames[0]];
            for (var i = 0; i < numElems - 1; i++) {
                joinTableNames.push(ext.createTableName("join_" + i + "_" +
                                    iteration, null, tmpTableTag));
                joinStr += 'join --leftTable ' + joinTableNames[i] +
                    ' --rightTable ' + avgTableNames[i + 1] +
                    ' --joinTable ' + joinTableNames[i + 1] + ';';
            }

            // Step 6e: Map the element avgs into stringified centroids
            var stringifyStr = 'map --eval "kmeans:stringifyVector(';
            for (var i = 0; i < numElems; i++) {
                stringifyStr += avgFieldNames[i];
                if (i !== numElems - 1) {
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
            var compareTableName = ext.createTableName("compare_" + iteration,
                                                        null, tmpTableTag);
            var distanceTableName = ext.createTableName("distance_" + iteration,
                                                    null, tmpTableTag);
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

            ext.query(queryStr)
            .then(function() {
                return ext.fetchColumnData(distanceField, distanceTableName,
                                            1, k);
            })
            .then(function(out) {
                // Step 7d: Check if any of the distances are above threshold
                for (var i = 0; i < out.length; i++) {
                    var distance = out[i];
                    if (distance > threshold) {
                        done = false;
                    }
                }

                // Step 8: Cleanup
                // Step 8a: Re-assign previous iteration information
                prevCentroidTableName = centroidTableName;
                prevCentroidColName = centroidColName;
                prevClusterColName = clusterColName;

                // Step 8b: Return whether or not we have reached the exit condition
                innerDeferred.resolve(done);
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }
    }

    return (UExtKMeans);
}({}));
