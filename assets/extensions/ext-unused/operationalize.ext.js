// module name must start with "UExt"
window.UExtOperationalize = (function(UExtOperationalize) {

    UExtOperationalize.buttons = [{
        "buttonText": "Operationalize",
        "fnName": "operationalize",
        "arrayOfFields": [],
    }];

    UExtOperationalize.actionFn = function(functionName) {

        switch (functionName) {
            case "operationalize":
                return operationalize();
            default:
                return null;
        }
    };

    function getDerivedCol(ext, tableInfo, col, srcTableName) {
        var deferred = XcSDK.Promise.deferred();

        var tableName = tableInfo.name;

        if (col.type === 'array' || col.type === 'object') {
            // array and object columns will be projected away at the end
            // this case also handles 'DATA' column, and leaves table unchanged
            deferred.resolve(tableName);
        } else if (!col.prefix) {
            // derived fields do not need to be processed, but must be added to
            // the columns projected at the end
            tableInfo.colsToProject.push(col.backName);
            deferred.resolve(tableName);
        } else {
            // convert prefix field of primitive type to derived
            var mapFn;
            if (col.type === 'integer' || col.type === 'float') {
                // convert all numbers to float, since we cannot determine
                // actual type of prefix fields
                mapFn = "float";
            } else if (col.type === 'boolean') {
                mapFn = "bool";
            } else {
                mapFn = "string";
            }
            var mapStr = mapFn + "(" + col.backName + ")";
            var newColName = ext.createUniqueCol(srcTableName,
                col.backName.replace('::', '_'), false);

            ext.map(mapStr, tableName, newColName, ext.createTempTableName())
            .then(function(tableAfterMap) {
                // add new column to array of columns to be projected finally
                tableInfo.colsToProject.push(newColName);
                // update latest table name so that all modified columns end
                // up in a single table
                tableInfo.name = tableAfterMap;
                deferred.resolve(tableAfterMap);
            })
            .fail(deferred.reject);
        }

        return deferred.promise();
    }

    /*
    operationalize: Converts prefix fields to derived fields and removes object
        and array fields from the given input table.
    */
    function operationalize() {
        var ext = new XcSDK.Extension();

        ext.start = function() {

            var deferred = XcSDK.Promise.deferred();

            var self = this;
            var srcTable = self.getTriggerTable();
            var srcTableName = srcTable.getName();

            var cols = srcTable.tableCols;
            var promises = [];
            var tableInfo = {"name": srcTableName, "colsToProject": []};
            // each promise processes one col of the table
            for (var i = 0; i < cols.length; i++) {
                var col = cols[i];
                promises.push(getDerivedCol.bind(window, ext, tableInfo,
                    col, srcTableName));
            }

            XcSDK.Promise.chain(promises)
            .then(function(derivedTable) {
                // project the processed prefix columns and the original
                // original derived columns
                var newTableName = ext.createTableName(null, null, srcTableName);
                return ext.project(tableInfo.colsToProject, derivedTable,
                    newTableName);
            })
            .then(function(projectedTable) {
                // hide all columns and display only the one's projected
                var table = ext.getTable(projectedTable);
                table.deleteAllCols();
                tableInfo.colsToProject.forEach(function(colName) {
                    table.addCol(new XcSDK.Column(colName));
                });
                return table.addToWorksheet();
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }

    return UExtOperationalize;
}({}));