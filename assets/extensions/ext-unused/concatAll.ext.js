// module name must start with "UExt"
window.UExtConcatAll = (function(UExtConcatAll) {
    UExtConcatAll.buttons = [{
        "buttonText": "Concat All Columns",
        "fnName": "concatAll",
        "arrayOfFields": [{
            "type": "string",
            "name": "Delimiter",
            "fieldClass": "delim",
            "typeCheck": {
                "allowEmpty": true
            }
        }]
    }];

    UExtConcatAll.actionFn = function(functionName) {
        switch (functionName) {
            case "concatAll":
                return concatAll();
            default:
                return null;
        }
    };

    function concatAll() {
        var ext = new XcSDK.Extension();

        ext.start = function() {
            var deferred = XcSDK.Promise.deferred();
            var self = this;

            concatEachGroup(ext)
            .then(function({mapTable, newColNames}) {
                return concatGeneratedGroup(ext, mapTable, newColNames);
            })
            .then(function(ret) {
                const finalTableName = ret.tableName;
                const newColName = ret.newColName;
                var table = ext.getTable(finalTableName);
                if (newColName != null) {
                    table.deleteAllCols();
                    var newCol = new XcSDK.Column(newColName, "string");
                    table.addCol(newCol);
                }

                var srcTableName = ext.getTriggerTable().getName();
                return table.addToWorksheet(srcTableName);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        // Do not forget to return the extension
        return ext;
    }

    function concatEachGroup(ext) {
        var deferred = XcSDK.Promise.deferred();
        var delim = getDelimiter(ext);
        var triggeredTable = ext.getTriggerTable();
        var cols = triggeredTable.getColsAsArray();
        var srcTableName = triggeredTable.getName();

        cols = cols.filter(function(col) {
            var type = col.getType();
            var colName = col.getName();
            return type !== "object" && type !== "array" && colName;
        });

        if (cols.length <= 1) {
            // when no columns to concat
            deferred.resolve({mapTable: srcTableName, newColNames: null});
            return deferred.promise();
        }

        var concatLimit = delim ? 8 : 16;
        var groupCols = [];
        while (cols.length > 0) {
            var splitCols = cols.splice(0, concatLimit);
            groupCols.push(splitCols);
        }
        var mapStrs = [];
        var newColNames = [];
        groupCols.forEach(function(cols) {
            var vals = cols.map(function(col) {
                var colName = col.getName();
                if  (col.getType() === "string") {
                    return `ifStr(exists(${colName}), ${colName}, "")`;
                } else {
                    return `ifStr(exists(string(${colName})), string(${colName}), "")`;
                }
            });

            var mapStr = "";
            var len = vals.length;
            for (var i = 0; i < len - 1; i++) {
                var val = vals[i];
                if (delim) {
                    mapStr += `concat(${val}, concat("${delim}", `;
                } else {
                    mapStr += `concat(${val}, `;
                }
            }

            mapStr += vals[len - 1];
            var closeBracket = delim ? "))" : ")";
            mapStr += closeBracket.repeat(len - 1);
            mapStrs.push(mapStr);
            newColNames.push(ext.createColumnName());
        });

        var newTableName = ext.createTempTableName();
        ext.map(mapStrs, srcTableName, newColNames, newTableName)
        .then(function(tableAfterMap) {
            deferred.resolve({mapTable: tableAfterMap, newColNames: newColNames});
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function concatGeneratedGroup(ext, tableName, colNames) {
        var deferred = XcSDK.Promise.deferred();
        if (colNames == null) {
            // when no columns to concat
            deferred.resolve({tableName});
            return deferred.promise();
        }

        var mapStr = "";
        if (colNames.length === 1) {
            mapStr = `string(${colNames[0]})`;
        } else {
            var delim = getDelimiter(ext);
            var len = colNames.length;
            for (var i = 0; i < len - 1; i++) {
                var colName = colNames[i];
                if (delim) {
                    mapStr += `concat(${colName}, concat("${delim}", `;
                } else {
                    mapStr += `concat(${colName}, `;
                }
            }

            mapStr += colNames[len - 1];
            var closeBracket = delim ? "))" : ")";
            mapStr += closeBracket.repeat(len - 1);
        }

        var srcTableName = ext.getTriggerTable().getName();
        var newColName = ext.createUniqueCol(srcTableName, "concat");

        var newTableName = ext.createTableName(null, null, srcTableName);
        ext.map([mapStr], tableName, [newColName], newTableName)
        .then(function(tableAfterMap) {
            deferred.resolve({tableName: tableAfterMap, newColName: newColName});
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getDelimiter(ext) {
        var args = ext.getArgs();
        return args.delim;
    }

    return UExtConcatAll;
}({}));