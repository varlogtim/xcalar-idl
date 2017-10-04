// module name must start with "UExt"
window.UExtSendSchema = (function(UExtSendSchema) {

    UExtSendSchema.buttons = [{
        "buttonText": "Send Schema",
        "fnName": "sendSchema",
        "arrayOfFields": [{
            "type": "string",
            "name": "Table Name",
            "fieldClass": "sqlTableName"
        }]
    },{
        "buttonText": "Finalize Table",
        "fnName": "finalizeTable",
        "arrayOfFields": [],
    }];

    UExtSendSchema.actionFn = function(functionName) {
        switch (functionName) {
            case "sendSchema":
                return sendSchema();
            case "finalizeTable":
                return finalizeTable();
            default:
                return null;
        }
    };

    function getDerivedColName(colName) {
        if (colName.indexOf("::") > 0) {
            colName = colName.split("::")[1];
        }
        if (colName.endsWith("_integer") || colName.endsWith("_float") ||
            colName.endsWith("_boolean") || colName.endsWith("_string")) {
            colName = colName.substring(0, colName.lastIndexOf("_"));
        }
        return colName;
    }

    // === Copied from derived conversion
    function getDerivedCol(ext, tableInfo, col, srcTableName) {
        var deferred = XcSDK.Promise.deferred();

        var tableName = tableInfo.name;

        if (col.type === 'array' || col.type === 'object') {
            // array and object columns will be projected away at the end
            // this case also handles 'DATA' column, and leaves table unchanged
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
            var newColName = getDerivedColName(col.backName).toUpperCase();

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
    convertToDerived: Converts prefix fields to derived fields and removes object
        and array fields from the given input table.
    */
    function finalizeTable() {
        var ext = new XcSDK.Extension();

        ext.start = function() {

            var deferred = XcSDK.Promise.deferred();

            var self = this;
            var srcTable = self.getTriggerTable();
            var srcTableName = srcTable.getName();

            var cols = srcTable.tableCols;
            var promises = [];
            var tableInfo = {"name": srcTableName, "colsToProject": []};
            var table;
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
                var hashIdx = newTableName.lastIndexOf("#");
                var tableNamePart = newTableName.substring(0, hashIdx);
                var hashPart = newTableName.substring(hashIdx);
                newTableName = tableNamePart.toUpperCase() + hashPart;
                return ext.project(tableInfo.colsToProject, derivedTable,
                    newTableName);
            })
            .then(function(projectedTable) {
                // hide all columns and display only the one's projected
                table = ext.getTable(projectedTable);
                table.deleteAllCols();
                tableInfo.colsToProject.forEach(function(colName) {
                    table.addCol(new XcSDK.Column(colName));
                });
                return table.addToWorksheet(srcTableName);
            })
            .then(function() {
                // XXX Make this a Table call
                Dag.makeTableNoDelete(table.getName());
                TblManager.makeTableNoDelete(table.getName());
                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }
    // ==== End copied from derived conversion

    function getSchema(tableId) {
        var cols = gTables[tableId].tableCols;
        var schema = [];
        for (var i = 0; i<cols.length; i++) {
            var key = cols[i].backName;
            if (key === "DATA") {
                continue;
            }
            var type = cols[i].type;
            var obj = {};
            obj[key] = type;
            schema.push(obj);
        }
        return schema;
    }

    /*
    operationalize: Converts prefix fields to derived fields and removes object
        and array fields from the given input table.
    */
    function sendPost(action, struct) {
        var deferred = jQuery.Deferred();
        jQuery.ajax({
            type: 'POST',
            data: JSON.stringify(struct),
            contentType: 'application/json',
            url: "http://seaborg.int.xcalar.com:12127/" + action,
            success: function(data) {
                if (data.status === 200) {
                    try {
                        deferred.resolve(data.stdout);
                    } catch (e) {
                        deferred.reject(e);
                        console.error(e);
                    }
                } else {
                    deferred.reject(data);
                    console.error(data);
                }
            },
            error: function(error) {
                deferred.reject(error);
                console.error(error);
            }
        });
        return deferred.promise();
    }

    function sendSchema() {
        var ext = new XcSDK.Extension();

        ext.start = function() {
            var deferred = XcSDK.Promise.deferred();

            var self = this;
            var srcTable = self.getTriggerTable();
            var srcTableName = srcTable.getName();

            var tableId = srcTableName.split("#")[1];
            var tableName = ext.getArgs().sqlTableName;
            var schema = getSchema(tableId);

            var tableMetaCol = {};
            tableMetaCol["XC_TABLENAME_" + srcTableName] = "string";
            schema.push(tableMetaCol);

            var structToSend = {};
            structToSend.tableName = tableName.toUpperCase();
            structToSend.tableColumns = schema;

            var s = {"newSchemaString": JSON.stringify(structToSend)};
            console.log(s);
            sendPost("updateSchema", s)
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }

    return UExtSendSchema;
}({}));