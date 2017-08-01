// module name must start with "UExt"
window.UExtMultiSort = (function(UExtMultiSort) {

    UExtMultiSort.buttons = [{
        "buttonText": "Multi Column Sort",
        "fnName": "multiSort",
        "arrayOfFields": [{
            "type": "column",
            "name": "Columns",
            "fieldClass": "cols",
            "typeCheck": {
                "columnType": ["number", "string", "boolean"]
            },
            "variableArg": true
        },
        {
            "type": "string",
            "name": "Ordering",
            "fieldClass": "sortOrder",
            "enums": ["Ascending", "Descending"],
            "autofill": "Ascending"
        }
        ],
    }];

    UExtMultiSort.actionFn = function(functionName) {
        switch (functionName) {
            case "multiSort":
                return multiSort();
            default:
                return null;
        }
    };

    /*
    modifyColumn: for a single column, it creates a map string, whose result
        is a modified string column that can be sorted according to the
        original datatype.

    col: column to be modified
    index: The index, or hierarchial rank of the column when sorting. It is
        used to store the result at the correct index in modifiedCols
    modifiedCols: stores the map strings which give modified cols
    */
    function modifyColumn(ext, col, index, modifiedCols, srcTableName) {
        var deferred = XcSDK.Promise.deferred();

        var colName = col.getName();
        var colType = col.getType();

        if (colType === "string") {
            modifiedCols[index] = colName;
            deferred.resolve();
        } else if (colType === "boolean") {
            // since "false" < "true" even as a string, bool's can be cast
            // directly
            var colCast = "string(" + colName + ")";
            modifiedCols[index] = colCast;
            deferred.resolve();
        } else {
            // for numbers, add a constant to make everything non-negative and
            // zero-pad according to largest number to sort.
            var maxPromise = ext.aggregate(XcSDK.Enums.AggType.Max, colName,
                srcTableName);
            var minPromise = ext.aggregate(XcSDK.Enums.AggType.Min, colName,
                srcTableName);

            XcSDK.Promise.when(maxPromise, minPromise)
            .then(function(maxNumberObj, minNumberObj) {
                var maxNumber = maxNumberObj[0];
                var minNumber = minNumberObj[0];
                var maxLen; // the total digits after zero-padding
                var positiveCol;
                if (minNumber < 0) {
                    // convert column to non-negative numbers
                    var modifiedMax = maxNumber - minNumber;
                    maxLen = modifiedMax.toString().split(".")[0].length;
                    // the subtraction makes everything non-negative
                    positiveCol = 'sub(' + colName + ', ' + minNumber + ')';
                } else {
                    // all numbers in the column are positive
                    maxLen = maxNumber.toString().split(".")[0].length;
                    positiveCol = colName;
                }

                // so we have substring(str_of_zeros, 1, maxLen + 1 - no_of_digits)
                // rather than substring(str_of_zeros, 0, maxLen - no_of_digits)
                // as the later returns the whole string if maxLen == no_of_digits
                // whereas we want it to return the empty string.
                maxLen += 1;
                // for padding, we need part before decimal for derived float
                // columns and all numerical prefix columns
                var cutMapStr;
                if (colType === "integer" && col.isDerivedField()) {
                    cutMapStr = 'string(' + positiveCol + ')';
                } else {
                    cutMapStr = 'cut(string(' + positiveCol + '), 1, ".")';
                }

                // e.g. for a float column with max 4 digits before decimal:
                // concat(substring("00000", 1, int(sub(5, len(cut(string(positiveCol), 1, "."))), 10)), string(positiveCol))
                var padMapStr = 'concat(substring("' + "0".repeat(maxLen) +
                    '", 1, int(sub(' + maxLen + ", len(" + cutMapStr +
                    ')), 10)), string(' + positiveCol + "))";
                // store the map strings, since the resultant columns are used
                // in the concatenation step
                modifiedCols[index] = padMapStr;
                deferred.resolve();
            })
            .fail(deferred.reject);
        }

        return deferred.promise();
    }

    /*
    multiSort: Sort by multiple columns in a hierarchial manner, similar to
        Order By in SQL

    cols: The columns to be sorted
    sortOrder: whether to sort ascending or descending
    */
    function multiSort() {
        var ext = new XcSDK.Extension();

        ext.beforeStart = function() {

            var self = this;
            var args = self.getArgs();
            var cols = args.cols;

            // Built-in sort is faster and uses less resources
            if (!Array.isArray(cols) || cols.length === 1) {
                return XcSDK.Promise.reject("Please use the built-in sort " +
                    "command when sorting a single column");
            }

            return XcSDK.Promise.resolve();
        };

        ext.start = function() {

            var deferred = XcSDK.Promise.deferred();

            var self = this;

            var args = self.getArgs();
            var cols = args.cols;
            var sortOrder;
            if (args.sortOrder === "Ascending") {
                sortOrder = XcalarOrderingT.XcalarOrderingAscending;
            } else if (args.sortOrder === "Descending") {
                sortOrder = XcalarOrderingT.XcalarOrderingDescending;
            }

            var srcTableName = ext.getTriggerTable().getName();
            var colNameToSort = ext.createUniqueCol(srcTableName,
                "Fields_concat");

            // generate map strings that modify each column to its compatible
            // form, in which it can be concatenated and sorted as a string
            var promises = [];
            var modifiedCols = [];
            for (var i = 0; i < cols.length; i++) {
                promises.push(modifyColumn(ext, cols[i], i,
                    modifiedCols, srcTableName));
            }

            // wait for map strings of all columns to be created
            XcSDK.Promise.when.apply(this, promises)
            .then(function() {
                // concatenate the output of each of these modified columns -
                // this column is the one eventually sorted
                var newColNames = modifiedCols;
                var concatMapStr = "";
                var lastIndex = newColNames.length - 1;

                // tab - low ascii value
                var colDelimeter = '\t\txc\t';

                for (var i = 0; i < lastIndex; i++) {
                    var currName = newColNames[i];
                    concatMapStr += "concat(" + currName + ", " + 'concat("' +
                        colDelimeter + '", ';
                }
                var endStr = ")".repeat(2*lastIndex);
                concatMapStr += newColNames[lastIndex] + endStr;

                return ext.map(concatMapStr, srcTableName, colNameToSort);
            })
            .then(function(tableAfterMap) {
                // sort according to concatenated column
                return ext.sort(sortOrder, colNameToSort, tableAfterMap);
            })
            .then(function(tableAfterSort) {
                // replace the original table with the new sorted one
                var table = ext.getTable(tableAfterSort);
                return table.addToWorksheet(srcTableName);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }

    return UExtMultiSort;
}({}));