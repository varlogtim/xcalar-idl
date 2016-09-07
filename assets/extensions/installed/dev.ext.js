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
        "arrayOfFields": [{
            "type"      : "column",
            "name"      : "Left Column",
            "fieldClass": "lCol",
            "autofill"  : true,
            "typeCheck" : {
                "multiColumn": true
            }
        },
        {
            "type"      : "table",
            "name"      : "Right Table",
            "fieldClass": "rTable"
        },
        {
            "type"      : "column",
            "name"      : "Right Column",
            "fieldClass": "rCol",
            "typeCheck" : {
                "multiColumn": true
            }
        },
        {
            "type"      : "number",
            "name"      : "Limit on left table",
            "fieldClass": "leftLimit",
            "typeCheck" : {
                "allowEmpty": true,
                "integer"   : true,
                "min"       : 1
            }
        },
        {
            "type"      : "number",
            "name"      : "Limit on right table",
            "fieldClass": "rightLimit",
            "typeCheck" : {
                "allowEmpty": true,
                "integer"   : true,
                "min"       : 1
            }
        },
        {
            "type"      : "boolean",
            "name"      : "Unlock Table",
            "fieldClass": "unlock",
            "autofill"  : false,
        }
        ],
    }];

    // UExtDev.actionFn must reutrn a XcSDK.Extension obj or null
    UExtDev.actionFn = function(functionName) {
        // it's a good convention to use switch/case to handle
        // different function in the extension and handle errors.
        switch (functionName) {
            case "estimateJoin":
                return estimateJoin();
            default:
                return null;
        }
    };

    // XXX: Handle multicolumn join estimator
    // XXX: If multicolumn-estimated, then we should just use that to continue
    // with the operation
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
            var rTableName = args.rTable.getName();
            var lColNames = getColNamesHepler(args.lCol);
            var lColName = lColNames[0];

            var srcTableName = self.getTriggerTable().getName();

            if (args.unlock === true) {
                // XXX Here we are double unlocking. It currently works since
                // the second unlock becomes a noop. But this is not future
                // proof.
                xcHelper.unlockTable(xcHelper.getTableId(srcTableName));
            }

            var leftLimit = args.leftLimit;
            if (leftLimit == null) {
                leftLimit = 100;
            }

            var rightLimit = args.rightLimit;
            if (rightLimit == null) {
                rightLimit = 100;
            }
            
            var leftGBColName = ext.createColumnName();
            var rightGBColName = ext.createColumnName();

            var leftGBTableName = "";
            var rightGBTableName = "";

            var leftCount = -1;
            var rightCount = -1;
            var leftPromise = ext.groupBy(AggrOp.Count, lColNames, lColName,
                                          false, srcTableName, leftGBColName,
                                          ext.createTempTableName())
            .then(function(tableName) {
                leftGBTableName = tableName;
                return ext.getNumRows(tableName);
            })
            .then(function(count) {
                leftCount = count;
                return ext.sortDescending(leftGBColName, leftGBTableName,
                                           ext.createTempTableName());
            })
            .then(function(leftSortedTable) {
                if (leftLimit > leftCount) {
                    leftLimit = leftCount;
                }
                return ext.fetchDataAndParse(leftSortedTable, 1, leftLimit);
            })
            .fail(function() {
                return PromiseHelper.reject();
            });

            var rColNames = getColNamesHepler(args.rCol);
            var rColName = rColNames[0];

            var rightPromise = ext.groupBy(AggrOp.Count, rColNames, rColName,
                                           false, rTableName, rightGBColName,
                                           ext.createTempTableName())
            .then(function(tableName) {
                rightGBTableName = tableName;
                return ext.getNumRows(tableName);
            })
            .then(function(count) {
                rightCount = count;
                return ext.sortDescending(rightGBColName, rightGBTableName,
                                           ext.createTempTableName());
            })
            .then(function(rightSortedTable) {
                if (rightLimit > rightCount) {
                    rightLimit = rightCount;
                }
                return ext.fetchDataAndParse(rightSortedTable, 1, rightLimit);
            })
            .fail(function() {
                return PromiseHelper.reject();
            });

            XcSDK.Promise.when(leftPromise, rightPromise)
            .then(function(leftArray, rightArray) {
                var minLeftValue =
                        leftArray[leftArray.length - 1][leftGBColName];
                var minRightValue =
                        rightArray[rightArray.length - 1][rightGBColName];
                // Convert left and right array into huge objects
                var i = 0;
                var leftObj = {};
                var rightObj = {};
                for (i = 0; i < leftArray.length; i++) {
                    leftObj[leftArray[i][lColName]] =
                                                    leftArray[i][leftGBColName];
                }
                for (i = 0; i < rightArray.length; i++) {
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

                deferred.resolve({
                    "maxSum": maxSum.toLocaleString(),
                    "expSum": expSum.toLocaleString(),
                    "minSum": minSum.toLocaleString()
                });
                // We only show alert modal if not triggered from joinView
                if (!args.fromJoin) {
                    Alert.show({
                        "title": "Estimated Join Size",
                        "msg"  : "Max Rows: " + maxSum.toLocaleString() + "\n" +
                                  "Expected Rows: " + expSum.toLocaleString() + "\n" +
                                  "Min Rows: " + minSum.toLocaleString() + "\n"
                    });
                }
            })
            .fail(function(leftError, rightError) {
                console.log(leftError, rightError);
                deferred.reject(leftError, rightError);
            });

            return deferred.promise();
        };

        // Do not forget to return the extension
        return ext;
    }

    function getColNamesHepler(cols) {
        return cols.map(function(col) { return col.getName(); });
    }

    return UExtDev;
}({}));