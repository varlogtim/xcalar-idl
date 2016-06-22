// module name must start with "UExt"
window.UExtDev = (function(UExtDev) {
    /* 
     * Note of UExtDev.buttons:
     * 1. it must be an array, each element is an object,
     *    which specify one function,
     *    one extension can have unlimited functions
     *
     * 2. Fields on object:
     *      buttonText: the extension function name that display on XI
     *      fnName: the function name, will pass into UExtDev.actionFn
     *      arrayOfFields: an array to specify the buttons on the extension function
     *
     * 3. Fields on arrayOfFields attribute:
     *      type: type of the arg, can be column, string, number or boolean
     *      name: the button name, which will dispaly on XI,
     *      fieldClass: Use this name to find the arg in ext obj
     *      tyepCheck: object to specify how to check the arg
     *          if type is column, columnType can strict the column's type,
     *          if type is number, min and max can strict the range
     *          and integer attr can strict the number is integer only
     */
    UExtDev.buttons = [{
        "buttonText"   : "Estimate Join Size",
        "fnName"       : "estimateJoin",
        "arrayOfFields": [
        {
            "type"      : "string",
            "name"      : "Right Full Tablename",
            "fieldClass": "rTable"
        },
        {
            "type"      : "string",
            "name"      : "Right Column",
            "fieldClass": "rCol"
        },
        {
            "type"      : "number",
            "name"      : "Limit on left table",
            "fieldClass": "leftLimit",
            "typeCheck" : {
                "allowEmpty": true,
                "integer": true,
                "min"    : 1
            }
        },
        {
            "type"      : "number",
            "name"      : "Limit on right table",
            "fieldClass": "rightLimit",
            "typeCheck" : {
                "allowEmpty": true,
                "integer": true,
                "min"    : 1
            }
        }
        ],
    }];

    // UExtDev.actionFn must reutrn a XcSDK.Extension obj or null 
    UExtDev.actionFn = function(functionName) {
        // it's a good convention to use switch/case to handle
        // different function in the extension and handle errors.
        switch(functionName) {
            case "estimateJoin":
                return estimateJoin();
            default:
                return null;
        }
    };

    function estimateJoin() {
        var ext = new XcSDK.Extension();
        // Implement ext.beforeStart(), ext.start() and
        // ext.afterFinish() to do any operations
        // Note that all the interfaces are optionally to implement
        // but usually you should impelement ext.start at least.

        ext.start = function() {
            // seach "js promise" online if you do not understand it
            // check promiseApi.js to see the api.
            var deferred = XcSDK.Promise.deferred();

            // JS convention, rename this to self in case of scoping issue
            var self = this;

            var args = self.getArgs();
            var rColName = args.rCol;
            var rTableName = args.rTable;
            var lColName = self.getTriggerCol().getName();
            var srcTableName = self.getTriggerTable().getName();
            var leftLimit = args.leftLimit || 100;
            var rightLimit = args.rightLimit || 100;
            
            var leftGBColName = ext.createColumnName();
            var rightGBColName = ext.createColumnName();

            var leftGBTableName = "";
            var rightGBTableName = "";

            var leftCount = -1;
            var rightCount = -1;

            var leftPromise = ext.groupBy(AggrOp.Count, [lColName], lColName,
                                          false, srcTableName, leftGBColName,
                                          ext.createTempTableName())
            .then(function(tableName) {
                leftGBTableName = tableName;
                return (ext.getNumRows(tableName));
            })
            .then(function(count) {
                leftCount = count;
                return (ext.sortDescending(leftGBColName, leftGBTableName,
                                           ext.createTempTableName()));
            })
            .then(function(leftSortedTable) {
                if (leftLimit > leftCount) {
                    leftLimit = leftCount;
                }
                return (ext.fetchDataAndParse(leftSortedTable, 1, leftLimit));
            })
            .fail(function() {
                return PromiseHelper.reject();
            });

            var rightPromise = ext.groupBy(AggrOp.Count, [rColName], rColName,
                                           false, rTableName, rightGBColName,
                                           ext.createTempTableName())
            .then(function(tableName) {
                rightGBTableName = tableName;
                return (ext.getNumRows(tableName));
            })
            .then(function(count) {
                rightCount = count;
                return (ext.sortDescending(rightGBColName, rightGBTableName,
                                           ext.createTempTableName()));
            })
            .then(function(rightSortedTable) {
                if (rightLimit > rightCount) {
                    rightLimit = rightCount;
                }
                return (ext.fetchDataAndParse(rightSortedTable, 1, rightLimit));
            })
            .fail(function() {
                return PromiseHelper.reject();
            });

            XcSDK.Promise.when(leftPromise, rightPromise)
            .then(function(leftArray, rightArray) {
                var minLeftValue = leftArray[leftArray.length-1][leftGBColName];
                var minRightValue =
                                rightArray[rightArray.length-1][rightGBColName];
                // Convert left and right array into huge objects
                var i = 0;
                var leftObj = {};
                var rightObj = {};
                for (i = 0; i<leftArray.length; i++) {
                    leftObj[leftArray[i][lColName]] =
                                                    leftArray[i][leftGBColName];
                }
                for (i = 0; i<rightArray.length; i++) {
                    rightObj[rightArray[i][rColName]] = 
                                                  rightArray[i][rightGBColName];
                }

                var maxSum = 0;
                var expSum = 0;
                var minSum = 0;

                var key;
                for (key in leftObj) {
                    if (key in rightObj) {
                        maxSum += leftObj[key] * rightObj[key];
                        expSum += leftObj[key] * rightObj[key];
                        minSum += leftObj[key] * rightObj[key];
                        delete rightObj[key];
                    } else {
                        maxSum += leftObj[key] * minRightValue;
                        expSum += leftObj[key] * minRightValue / 2;
                    }
                }

                for (key in rightObj) {
                    maxSum += rightObj[key] * minLeftValue;
                    expSum += rightObj[key] * minLeftValue/2;
                }

                var numKeysLeftInLeftTable = leftCount - leftLimit;
                var numKeysLeftInRightTable = rightCount - rightLimit;

                maxSum += numKeysLeftInLeftTable * minRightValue;
                maxSum += numKeysLeftInRightTable * minLeftValue;
                expSum += numKeysLeftInLeftTable * minRightValue/2;
                expSum += numKeysLeftInRightTable * minLeftValue/2;

                deferred.resolve();
                Alert.show({
                    "title" : "Estimated Join Size",
                    "msg"   : "Max Rows: " + maxSum.toLocaleString() + "\n" +
                              "Expected Rows: " + expSum.toLocaleString() + "\n" +
                              "Min Rows: " + minSum.toLocaleString() + "\n"
                });
            })
            .fail(function(leftError, rightError) {
                console.log(leftError, rightError);
                deferred.reject();
            });



            return deferred.promise();
        };

        // Do not forget to return the extension
        return ext;
    }

    return UExtDev;
}({}));