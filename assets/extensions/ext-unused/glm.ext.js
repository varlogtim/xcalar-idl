window.UExtGLM = (function(UExtGLM) {
    UExtGLM.buttons = [{
        "buttonText": "Simple Linear Regression",
        "fnName": "simpleLinearRegression",
        "arrayOfFields": [{
            "type": "column",
            "name": "Independent Variable (x)",
            "fieldClass": "xCol",
            "autofill": true,
            "typeCheck": {
                "columnType": ["number"]
            }
        },
        {
            "type": "column",
            "name": "Dependent Variable (y)",
            "fieldClass": "yCol",
            "typeCheck": {
                "columnType": ["number"]
            }
        }]
    }];

    UExtGLM.actionFn = function(functionName) {
        switch (functionName) {
            case ("simpleLinearRegression"):
                return simpleLinearRegression();
            default:
                return null;
        }
    };

    function simpleLinearRegression() {
        var ext = new XcSDK.Extension();

        ext.start = function() {
            // Step 1: Initialize

            // REGRESSION:
            // Step 2: Aggregate avg(x) and avg(y)

            // Step 3: Calculate B (intercept)
            // Step 3a: Map each x point to its difference from avg(x)
            // Step 3b: Map the difference to the squared difference
            // Step 3c: Aggregate sum of squared differences
            //          to find the variance
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

            // Step 1: Initialize
            var deferred = XcSDK.Promise.deferred();
            var self = this;

            var args = self.getArgs();
            var xCol = args.xCol.getName();
            var yCol = args.yCol.getName();

            var tableName = self.getTriggerTable().getName();
            var tmpTableTag = ext.createTableName("_", "_GLMtemp");

            // REGRESSION:
            // Step 2: Aggregate avg(x) and avg(y)
            var xAvg = ext.createTableName(null, tmpTableTag, "xAvg");
            var yAvg = ext.createTableName(null, tmpTableTag, "yAvg");
            var xConst = ext.getConstant(xAvg);
            var yConst = ext.getConstant(yAvg);
            var avgStr =
                "aggregate --eval \"avg(" + xCol + ")\"" +
                " --srctable " + tableName +
                " --dsttable " + xAvg + ";" +
                "aggregate --eval \"avg(" + yCol + ")\"" +
                " --srctable " + tableName +
                " --dsttable " + yAvg + ";";

            // Step 3: Calculate B
            var xDiff = "slr_xDiff";
            var xDiffTName = ext.createTableName(null, tmpTableTag, xDiff);

            var squared = "slr_xDiff_squared";
            var squaredTName = ext.createTableName(null, tmpTableTag, squared);

            var variance = ext.createTableName(null, tmpTableTag,
                                                "slr_variance");
            var varConst = ext.getConstant(variance);

            var yDiff = "slr_yDiff";
            var yDiffTName = ext.createTableName(null, tmpTableTag, yDiff);

            var prod = "slr_xDiff_mult_yDiff";
            var prodTName = ext.createTableName(null, tmpTableTag, prod);

            var div = "slr_prod_div_variance";
            var divTName = ext.createTableName(null, tmpTableTag, div);

            var B = ext.createTableName(null, tmpTableTag, "B");
            var BStr =
                // Step 3a: Map each x point to its difference from avg(x)
                "map --eval \"sub(" + xCol + "," + xConst + ")\"" +
                " --fieldName " + xDiff +
                " --srctable " + tableName +
                " --dsttable " + xDiffTName + ";" +

                // Step 3b: Map the difference to the squared difference
                "map --eval \"pow(" + xDiff + ",2)\"" +
                " --fieldName " + squared +
                " --srctable " + xDiffTName +
                " --dsttable " + squaredTName + ";" +

                // Step 3c: Aggregate sum of squared differences to
                // find the variance
                "aggregate --eval \"sum(" + squared + ")\"" +
                " --srctable " + squaredTName +
                " --dsttable " + variance + ";" +

                // Step 3d: Map each y point to its difference from avg(y)
                "map --eval \"sub(" + yCol + "," + yConst + ")\"" +
                " --fieldName " + yDiff +
                " --srctable " + xDiffTName +
                " --dsttable " + yDiffTName + ";" +

                // Step 3e: Map the product of xDiff and yDiff
                "map --eval \"mult(" + xDiff + "," + yDiff + ")\"" +
                " --fieldName " + prod +
                " --srctable " + yDiffTName +
                " --dsttable " + prodTName + ";" +

                // Step 3f: Map the product divided by variance
                "map --eval \"div(" + prod + "," + varConst + ")\"" +
                " --fieldName " + div +
                " --srctable " + prodTName +
                " --dsttable " + divTName + ";" +

                // Step 3g: Aggregate the sum of the division to find B
                "aggregate --eval \"sum(" + div + ")\"" +
                " --srctable " + divTName +
                " --dsttable " + B + ";";

            // Step 4: Plot the line
            // Step 4a: Assign a to its formula in eval string format
            var Bconst = ext.getConstant(B);
            var aEval = "sub(" + yConst + ",mult(" +
                        Bconst + "," + xConst + "))";

            // Step 4b: Map each x point to (y = a + Bx)
            var outputLine = "slr_output_line";
            var outputTName = ext.createTableName("slr_");
            var lineStr =
                "map --eval \"add(" + aEval + ",mult(" + Bconst +
                    "," + xCol + "))\"" +
                " --fieldName " + outputLine +
                " --srctable " + tableName +
                " --dsttable " + outputTName + ";";

            // Step 5: Drop all temporaries
            var dropStr = "drop table *" + tmpTableTag + "*;" +
                " drop constant *" + tmpTableTag + "*;";

            // submit query here
            var queryStr = avgStr + BStr + lineStr + dropStr;
            ext.query(queryStr)
            .then(function() {
                // FINAL:
                // Step 5: Display x, y, and the output from line function
                var finalTable = ext.createNewTable(outputTName);
                finalTable.addCol(new XcSDK.Column(xCol, "float"));
                finalTable.addCol(new XcSDK.Column(yCol, "float"));
                finalTable.addCol(new XcSDK.Column(outputLine, "float"));

                return finalTable.addToWorksheet();
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }

    return (UExtGLM);
}({}));
