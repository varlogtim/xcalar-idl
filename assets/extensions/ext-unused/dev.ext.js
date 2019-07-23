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
        "buttonText": "Estimate Join Size",
        "fnName": "estimateJoin",
        "arrayOfFields": [{
            "type": "column",
            "name": "Left Column",
            "fieldClass": "lCol",
            "autofill": true,
            "typeCheck": {
                "multiColumn": true
            }
        },
        {
            "type": "table",
            "name": "Right Table",
            "fieldClass": "rTable"
        },
        {
            "type": "column",
            "name": "Right Column",
            "fieldClass": "rCol",
            "typeCheck": {
                "multiColumn": true,
                "tableField": "rTable"
            }
        },
        {
            "type": "string",
            "name": "Join Type",
            "fieldClass": "joinType",
            "autofill": "innerJoin",
            "enums": ["leftouter", "rightOuter", "innerJoin", "fullOuter"],
            "typeCheck": {
                "allowEmpty": true
            }
        },
        {
            "type": "number",
            "name": "Limit on left table",
            "fieldClass": "leftLimit",
            "typeCheck": {
                "allowEmpty": true,
                "integer": true,
                "min": 1
            }
        },
        {
            "type": "number",
            "name": "Limit on right table",
            "fieldClass": "rightLimit",
            "typeCheck": {
                "allowEmpty": true,
                "integer": true,
                "min": 1
            }
        },
        {
            "type": "boolean",
            "name": "Unlock Table",
            "fieldClass": "unlock",
            "autofill": false,
        }
        ]
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
            var lColNames = getColNamesHelper(args.lCol);
            var lColName = lColNames[0];

            var srcTableName = self.getTriggerTable().getName();

            if (args.unlock === true) {
                // XXX Here we are double unlocking. It currently works since
                // the second unlock becomes a noop. But this is not future
                // proof.
                TblFunc.unlockTable(xcHelper.getTableId(srcTableName));
                TblFunc.unlockTable(xcHelper.getTableId(rTableName));
            }

            var leftLimit = args.leftLimit;
            if (leftLimit == null) {
                leftLimit = 100;
            }

            var rightLimit = args.rightLimit;
            if (rightLimit == null) {
                rightLimit = 100;
            }

            var joinType = args.joinType;
            if (joinType == null) {
                joinType = "inner";
            } else {
                joinType = joinType.toLowerCase().replace(/ /g, "")
                                                 .replace("join", "");
            }

            var leftGBColName = ext.createColumnName();
            var rightGBColName = ext.createColumnName();

            var leftGBTableName = "";
            var rightGBTableName = "";

            var leftCount = -1;
            var rightCount = -1;

            // var origLeftNumRows = -1; // No groupby
            // var origRightNumRows = -1; // No groupby

            var leftRowsPromise = ext.getNumRows(srcTableName);
            var rightRowsPromise = ext.getNumRows(rTableName);
            var lOpts = {
                "newTableName": ext.createTempTableName(),
                "clean": true
            };
            var leftPromise = ext.groupBy(AggrOp.Count, lColNames, lColName,
                                          srcTableName, leftGBColName, lOpts)
            .then(function(ret) {
                const tableName = ret.dstTable;
                leftGBTableName = tableName;
                return ext.getNumRows(tableName);
            })
            .then(function(count) {
                leftCount = count;
                return ext.sortDescending([leftGBColName], leftGBTableName,
                                           ext.createTempTableName());
            })
            .then(function(leftSortedTable) {
                if (leftLimit > leftCount) {
                    leftLimit = leftCount;
                }
                if (leftCount === 0) {
                    return PromiseHelper.resolve([]);
                } else {
                    return ext.fetchDataAndParse(leftSortedTable, 1, leftLimit);
                }
            })
            .fail(function() {
                return PromiseHelper.reject();
            });

            var rColNames = getColNamesHelper(args.rCol);
            var rColName = rColNames[0];
            var rOpts = {
                "newTableName": ext.createTempTableName(),
                "clean": true
            };
            var rightPromise = ext.groupBy(AggrOp.Count, rColNames, rColName,
                                           rTableName, rightGBColName, rOpts)
            .then(function(ret) {
                const tableName = ret.dstTable;
                rightGBTableName = tableName;
                return ext.getNumRows(tableName);
            })
            .then(function(count) {
                rightCount = count;
                return ext.sortDescending([rightGBColName], rightGBTableName,
                                           ext.createTempTableName());
            })
            .then(function(rightSortedTable) {
                if (rightLimit > rightCount) {
                    rightLimit = rightCount;
                }
                if (rightCount === 0) {
                    return PromiseHelper.resolve([]);
                } else {
                    return ext.fetchDataAndParse(rightSortedTable, 1, rightLimit);
                }
            })
            .fail(function() {
                return PromiseHelper.reject();
            });

            XcSDK.Promise.when(leftPromise, rightPromise, leftRowsPromise,
                               rightRowsPromise)
            .then(function(ret) {
                const leftArray = ret[0];
                const rightArray = ret[1];
                const numLeftRows = ret[2];
                const numRightRows = ret[3];
                var maxSum = 0;
                var expSum = 0;
                var minSum = 0;

                if (!leftArray.length || !rightArray.length) {
                    // if table is empty
                    if (leftArray.length && (joinType === "leftouter" || joinType === "fullouter")) {
                        maxSum = expSum = minSum = numLeftRows;
                    } else if (rightArray.length && (joinType === "rightouter" || joinType === "fullouter")) {
                        maxSum = expSum = minSum = numRightRows;
                    } // else all values are 0
                } else {
                    var minLeftValue =
                        leftArray[leftArray.length - 1][leftGBColName];
                    var minRightValue =
                        rightArray[rightArray.length - 1][rightGBColName];
                    // Convert left and right array into huge objects
                    var i = 0;
                    var leftObj = {};
                    var rightObj = {};
                    var lKeyCol = ext.convertPrefixColumn(lColName);
                    for (i = 0; i < leftArray.length; i++) {
                        leftObj[leftArray[i][lKeyCol]] =
                                                        leftArray[i][leftGBColName];
                    }
                    var rKeyCol = ext.convertPrefixColumn(rColName);
                    for (i = 0; i < rightArray.length; i++) {
                        rightObj[rightArray[i][rKeyCol]] =
                                                    rightArray[i][rightGBColName];
                    }

                    var key;
                    var leftRowsCovered = 0;
                    var rightRowsCovered = 0;
                    for (key in leftObj) {
                        leftRowsCovered += leftObj[key];
                    }
                    for (key in rightObj) {
                        rightRowsCovered += rightObj[key];
                    }

                    for (key in leftObj) {
                        if (key in rightObj) {
                            maxSum += leftObj[key] * rightObj[key];
                            expSum += leftObj[key] * rightObj[key];
                            minSum += leftObj[key] * rightObj[key];
                            delete rightObj[key];
                        } else {
                            if (joinType === "leftouter" ||
                                joinType === "fullouter") {
                                minSum += leftObj[key];
                            }
                            maxSum += leftObj[key] * minRightValue;
                            expSum += leftObj[key] * minRightValue / 2;
                        }
                    }

                    for (key in rightObj) {
                        if (joinType === "rightouter" ||
                            joinType === "fullouter") {
                            minSum += rightObj[key];
                        }
                        maxSum += rightObj[key] * minLeftValue;
                        expSum += rightObj[key] * minLeftValue/2;
                    }

                    var numKeysLeftInLeftTable = leftCount - leftLimit;
                    var numKeysLeftInRightTable = rightCount - rightLimit;

                    maxSum += (numKeysLeftInLeftTable + numKeysLeftInRightTable) *
                            minRightValue * minLeftValue;
                    expSum += (numKeysLeftInLeftTable + numKeysLeftInRightTable) *
                            (minRightValue / 2) * (minLeftValue / 2);
                    if (joinType === "leftouter" || joinType === "fullouter") {
                        minSum += numLeftRows - leftRowsCovered;
                    }
                    if (joinType === "rightouter" || joinType === "fuillouter") {
                        minSum += numRightRows - rightRowsCovered;
                    }
                }

                deferred.resolve({
                    "maxSum": maxSum.toLocaleString(),
                    "expSum": expSum.toLocaleString(),
                    "minSum": minSum.toLocaleString()
                });
                // We only show alert modal if not triggered from Join Op Panel
                if (!args.fromJoin) {
                    Alert.show({
                        "title": "Estimated Join Size",
                        "msg": "Max Rows: " + maxSum.toLocaleString() + "\n" +
                                "Expected Rows: " + expSum.toLocaleString() +
                                "\n" + "Min Rows: " + minSum.toLocaleString() +
                                "\n",
                        "hideButtons": ["confirm"],
                        "buttons": [
                            {
                                "name": AlertTStr.Close,
                                "className": "cancel"
                            }
                        ]
                    });
                }
            })
            .fail(function(args) {
                var error = null;
                for (var i = 0; i < args.length; i++) {
                    var arg = args[i];
                    if (arg != null &&
                        typeof arg === "object" &&
                        !(arg instanceof Array)) {
                        error = arg;
                        break;
                    }
                }

                console.log(error);
                deferred.reject(error);
            });

            return deferred.promise();
        };

        // Do not forget to return the extension
        return ext;
    }

    function getColNamesHelper(cols) {
        return cols.map(function(col) { return col.getName(); });
    }

    return UExtDev;
}({}));