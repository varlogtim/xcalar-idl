// module name must start with "UExt"
window.UExtCompleteColumns = (function(UExtCompleteColumns) {

    UExtCompleteColumns.buttons = [{
        "buttonText": "Complete Columns",
        "fnName": "completeColumns",
        "arrayOfFields": [],
    }];

    UExtCompleteColumns.actionFn = function(functionName) {
        // it's a good convention to use switch/case to handle
        // different function in the extension and handle errors.
        switch (functionName) {
            case "completeColumns":
                return completeColumns();
            default:
                return null;
        }
    };

    /*
    getColNamesData: Returns a promise that is resolved with an array of
        objects, where each object has all fields present in one particular
        partfile as its keys.

    filterString: a string which results in a table which only has one row per
        partfile, and this row has all fields in the partfile
    */
    function getColNamesData(ext, filterString, srcTableName) {
        var deferred = XcSDK.Promise.deferred();

        var tableAfterFilter;
        ext.filter(filterString, srcTableName, ext.createTempTableName())
        .then(function(filteredTable) {
            tableAfterFilter = filteredTable;
            // the number of Rows is equal to the number of partfiles,
            return ext.getNumRows(filteredTable);
        })
        .then(function(numRows) {
            // get array (of length numRows) of objects, each object
            // has all fields in one partfile (and 'xcMeta') as keys
            return ext.fetchDataAndParse(tableAfterFilter, 1, numRows);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    /*
    completeColumns: for data with an indeterrminate number of fields, this
        extension pulls out columns for every field in any record. The data
        must be streamed in with the getAllKeysFromPartfiles UDF for this
        extension to work.
    */
    function completeColumns() {
        var ext = new XcSDK.Extension();

        ext.start = function() {

            var deferred = XcSDK.Promise.deferred();

            var self = this;

            var srcTable = self.getTriggerTable();
            var srcTableName = srcTable.getName();

            // source table has only one prefix when first created
            var fltColName = srcTable.getPrefixMeta()[0].name + "::xcMeta";
            // rows which satisfy this condition have values for all fields
            // present in any record of the particular partfile they belong to.
            var fltStr = "eq(" + fltColName + ", 1)";

            // promise is resolved with an array of objects. The keys of these
            // objects are all the fields in one particular partfile
            var dataPromise = getColNamesData(ext, fltStr, srcTableName);

            // rows with "xcMeta" = 1 are artificially added to get field names
            // and need to be excluded from the final table
            var excStr = "neq(" + fltColName + ", 1)";
            var newTableName = ext.createTableName(null, null, srcTableName);
            var excRowsPromise = ext.filter(excStr, srcTableName, newTableName);

            XcSDK.Promise.when(excRowsPromise, dataPromise)
            .then(function(tableAfterExclude, data) {
                // display all columns using information in data, the array of
                // objects which has all field names
                var table = ext.getTable(tableAfterExclude);
                table.deleteAllCols();
                data.forEach(function(row) {
                    Object.keys(row).forEach(function(colName) {
                        // do not pull out xcMeta column
                        if (colName !== fltColName) {
                            var col = new XcSDK.Column(colName);
                            table.addCol(col);
                        }
                    });
                });
                return table.addToWorksheet(srcTableName);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }

    return UExtCompleteColumns;
}({}));