// module name must start with "UExt"
window.UExtDerivedConversion = (function(UExtDerivedConversion) {

    UExtDerivedConversion.buttons = [{
        "buttonText": "Derived Field Conversion",
        "fnName": "derivedConversion",
        "arrayOfFields": [{
            "name": "Keep original",
            "fieldClass": "keep",
            "type": "boolean",
            "autofill": true
        }],
    }];

    UExtDerivedConversion.actionFn = function(functionName) {

        switch (functionName) {
            case "derivedConversion":
                return convertToDerived();
            default:
                return null;
        }
    };

    /*
    convertToDerived: Converts prefix fields to derived fields and removes object
        and array fields from the given input table.
    */
    function convertToDerived() {
        var ext = new XcSDK.Extension();

        ext.start = function() {

            var deferred = XcSDK.Promise.deferred();

            var self = this;
            var srcTable = self.getTriggerTable();
            var srcTableName = srcTable.getName();
            var args = self.getArgs();
            var keep = args.keep;

            var cols = srcTable.tableCols;
            var mapStrs = [];
            var newColNames = [];
            var colsToProject = [];
            var usedCols = {};
            // each promise processes one col of the table
            for (var i = 0; i < cols.length; i++) {
                var col = cols[i];
                if (col.type === 'array' || col.type === 'object') {
                    // array and object columns will be projected away at the end
                    // this case also handles 'DATA' column, and leaves table unchanged
                    continue;
                } else if (!col.prefix) {
                    // derived fields do not need to be processed, but must be added to
                    // the columns projected at the end
                    colsToProject.push(col.backName);
                    usedCols[col.backName] = true;
                    continue;
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
                    var newColName = ext.convertPrefixColumn(col.backName);
                    if (usedCols.hasOwnProperty(newColName)) {
                        // remove duplicate name
                        newColName = ext.createUniqueCol(srcTableName, newColName, false);
                    }

                    mapStrs.push(mapStr);
                    newColNames.push(newColName);
                    usedCols[newColName] = true;
                    colsToProject.push(newColName);
                }
            }

            var def = mapStrs.length === 0 ?
            XcSDK.Promise.resolve(srcTableName) :
            ext.map(mapStrs, srcTableName, newColNames);

            def
            .then(function(derivedTable) {
                if (keep) {
                    return XcSDK.Promise.resolve(derivedTable);
                } else {
                    // project the processed prefix columns and the original
                    // original derived columns
                    var newTableName = ext.createTableName(null, null, srcTableName);
                    return ext.project(colsToProject, derivedTable, newTableName);
                }
            })
            .then(function(projectedTable) {
                if (srcTableName === projectedTable) {
                    return;
                }
                // hide all columns and display only the one's projected
                var table = ext.getTable(projectedTable);
                table.deleteAllCols();
                colsToProject.forEach(function(colName) {
                    table.addCol(new XcSDK.Column(colName));
                });
                return table.addToWorksheet(srcTableName);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }

    return UExtDerivedConversion;
}({}));
