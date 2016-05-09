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
window.UExtGLM = (function(UExtGLM, $) {
    UExtGLM.buttons = [
        {"buttonText": "Simple Linear Regression",
         "fnName": "simpleLinearRegression",
         "arrayOfFields": [{"type": "column",
                            "name": "column 1",
                            "fieldClass": "col1"},
                           {"type": "column",
                            "name": "column 2",
                            "fieldClass": "col2"}]
        }
    ];
    UExtGLM.undoActionFn = undefined;
    UExtGLM.actionFn = function(colNum, tableId, functionName, argList) {
        var table = gTables[tableId];
        var tableName = table.tableName;
        var tableNameRoot = tableName.split("#")[0];
        var tmpTableTag = "_" + tableNameRoot + "_GLMtemp";
        switch (functionName) {
        case ("simpleLinearRegression"):
            var xCol = argList['col1'];
            var yCol = argList['col2'];
            simpleLinearRegression(xCol, yCol, tableName);
            return (true);
        default:
            return (true);
        }

        function simpleLinearRegression(xCol, yCol, tableName) {
            if (verbose) {
                console.log("Starting Simple Linear Regression");
            }
            // INIT:
            // Step 1: Start the transaction and lock the table

            // REGRESSION:
            // Step 2: Aggregate avg(x) and avg(y)

            // Step 3: Calculate B
            // Step 3a: Map each x point to its difference from avg(x)
            // Step 3b: Map the difference to the squared difference
            // Step 3c: Aggregate sum of squared differences to find the variance
            // Step 3d: Map each y point to its difference from avg(y)
            // Step 3e: Map the product of xDiff and yDiff
            // Step 3f: Map the product divided by variance
            // Step 3g: Aggregate the sum of the division to find B

            // Step 4: Plot the line
            // Step 4a: Assign a to its formula in eval string format
            // Step 4b: Map each x point to (y = a + Bx)

            // Step 5: Drop all temporaries

            // FINAL:
            // Step 5: Display x, y, and the output from the line function
            // Step 6: Unlock the table and end the transaction

            // INIT:
            var deferred = jQuery.Deferred();
            var tableId = xcHelper.getTableId(tableName);
            var table = gTables[tableId];
            var workSheet = WSManager.getWSFromTable(tableId);
            var resultSet;

            // Step 1: Start the transaction and lock the table
            var txId = Transaction.start({
                msg: "Simple Linear Regression: x:" + xCol + " y:" + yCol,
                operation: "SLR",
                sql: null
            });
            xcHelper.lockTable(tableId);


            // REGRESSION:
            // Step 2: Aggregate avg(x) and avg(y)
            var xAvg = "xAvg" + tmpTableTag + Authentication.getHashId();
            var yAvg = "yAvg" + tmpTableTag + Authentication.getHashId();
            avgStr =
                "aggregate --eval \"avg(" + xCol + ")\"" +
                " --srctable " + tableName +
                " --dsttable " + xAvg + ";" +
                "aggregate --eval \"avg(" + yCol + ")\"" +
                " --srctable " + tableName +
                " --dsttable " + yAvg + ";";

            // Step 3: Calculate B
            var xDiff = "slr_xDiff";
            var xDiffTableName = xDiff + tmpTableTag + Authentication.getHashId();

            var squared = "slr_xDiff_squared";
            var squaredTableName = squared + tmpTableTag + Authentication.getHashId();

            var variance = "slr_variance" + tmpTableTag + Authentication.getHashId();

            var yDiff = "slr_yDiff";
            var yDiffTableName = yDiff + tmpTableTag + Authentication.getHashId();

            var prod = "slr_xDiff_mult_yDiff";
            var prodTableName = prod + tmpTableTag + Authentication.getHashId();

            var div = "slr_prod_div_variance";
            var divTableName = div + tmpTableTag + Authentication.getHashId();

            var B = "B" + tableNameRoot + Authentication.getHashId();
            var BStr =
                // Step 3a: Map each x point to its difference from avg(x)
                "map --eval \"sub(" + xCol + ",@" + xAvg +")\"" +
                " --fieldName " + xDiff +
                " --srctable " + tableName +
                " --dsttable " + xDiffTableName + ";" +

                // Step 3b: Map the difference to the squared difference
                "map --eval \"pow(" + xDiff + ",2)\"" +
                " --fieldName " + squared +
                " --srctable " + xDiffTableName +
                " --dsttable " + squaredTableName + ";" +

                // Step 3c: Aggregate sum of squared differences to find the variance
                "aggregate --eval \"sum(" + squared + ")\"" +
                " --srctable " + squaredTableName +
                " --dsttable " + variance + ";" +

                // Step 3d: Map each y point to its difference from avg(y)
                "map --eval \"sub(" + yCol + ",@" + yAvg +")\"" +
                " --fieldName " + yDiff +
                " --srctable " + xDiffTableName +
                " --dsttable " + yDiffTableName + ";" +

                // Step 3e: Map the product of xDiff and yDiff
                "map --eval \"mult(" + xDiff + "," + yDiff +")\"" +
                " --fieldName " + prod +
                " --srctable " + yDiffTableName +
                " --dsttable " + prodTableName + ";" +

                // Step 3f: Map the product divided by variance
                "map --eval \"div(" + prod + ",@" + variance +")\"" +
                " --fieldName " + div +
                " --srctable " + prodTableName +
                " --dsttable " + divTableName + ";" +

                // Step 3g: Aggregate the sum of the division to find B
                "aggregate --eval \"sum(" + div + ")\"" +
                " --srctable " + divTableName +
                " --dsttable " + B + ";";

            // Step 4: Plot the line
            // Step 4a: Assign a to its formula in eval string format
            var aEval = "sub(@" + yAvg + ",mult(@" + B + ",@" + xAvg + "))";

            // Step 4b: Map each x point to (y = a + Bx)
            var outputLine = "slr_output_line";
            var outputTableName = "slr_" + tableNameRoot + Authentication.getHashId();
            var lineStr =
                "map --eval \"add(" + aEval + ",mult(@" + B + "," + xCol + "))\"" +
                " --fieldName " + outputLine +
                " --srctable " + tableName +
                " --dsttable " + outputTableName + ";";

            // Step 5: Drop all temporaries
            var dropStr = "drop table *" + tmpTableTag + "*;" +
                " drop constant *" + tmpTableTag + "*;";

            // submit query here
            var queryStr = avgStr + BStr + lineStr + dropStr;
            XcalarQueryWithCheck("slr_" + tableNameRoot +"_query_" +
                                 Authentication.getHashId(), queryStr)
            .then(function() {
                // FINAL:
                // Step 5: Display x, y, and the output from line function
                var finalTableId = xcHelper.getTableId(outputTableName);
                var finalCols = [];

                finalCols[0] = ColManager.newPullCol(xCol, "float");
                finalCols[1] = ColManager.newPullCol(yCol, "float");
                finalCols[2] = ColManager.newPullCol(outputLine, "float");
                finalCols[3] = ColManager.newDATACol();

                return TblManager.refreshTable([outputTableName], finalCols,
                                               [], workSheet);
            })
            .then(function() {
                // Step 6: Unlock the table and end the transaction
                xcHelper.unlockTable(tableId);
                Transaction.done(txId, {
                    msgTable: xcHelper.getTableId(xcHelper.getTableId(outputTableName))
                });
                deferred.resolve();
            }).fail(function(error) {
                // FAILURE
                xcHelper.unlockTable(tableId);
                Transaction.fail(txId, {
                    failMsg: "Simple Linear Regression failed",
                    error: error
                });
                deferred.reject(error);
            });
            return deferred.promise();
        }
    };
    return (UExtGLM);
}({}, jQuery));
