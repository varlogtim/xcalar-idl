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
    // },{
    //     "buttonText": "Finalize Table",
    //     "fnName": "finalizeTable",
    //     "arrayOfFields": [],
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
        colName = colName.replace(/[\^,\(\)\[\]{}'"\.\\ ]/g, "_");
        return colName;
    }

    // === Copied from derived conversion
    function getDerivedCol(col) {

        if (col.type === 'array' || col.type === 'object') {
            // array and object columns will be projected away at the end
            // this case also handles 'DATA' column, and leaves table unchanged
            return;
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

            return {colName: newColName, mapStr: mapStr};
        }

    }

    function finalizeTable(srcTable, ext) {
        var deferred = XcSDK.Promise.deferred();

        var srcTableName = srcTable.getName();

        var cols = srcTable.tableCols;
        var promises = [];
        var tableInfo = {"name": srcTableName, "colsToProject": []};
        var table;

        var mapArray = [];
        for (var i = 0; i < cols.length; i++) {
            var col = cols[i];
            if (col.name === "DATA") {
                continue;
            }
            var colStruct = getDerivedCol(col);
            if (!colStruct) {
                deferred.reject("Cannot have arrays / structs");
            }
            tableInfo.colsToProject.push(colStruct.colName);
            mapArray.push(colStruct.mapStr);
        }

        ext.map(mapArray, srcTableName, tableInfo.colsToProject)
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
            deferred.resolve(table.getName());
        })
        .fail(deferred.reject);

        return deferred.promise();
    }
    // ==== End copied from derived conversion

    function getSchema(tableId) {
        var cols = gTables[tableId].tableCols;
        var deferred = PromiseHelper.deferred();
        var schema = [];
        var dateIndex = [];
        var dateKeys = [];
        for (var i = 0; i<cols.length; i++) {
            var key = cols[i].backName;
            if (key === "DATA") {
                continue;
            }
            var type = cols[i].type;
            var $tds = $("#xcTable-" + tableId).find("tbody td.col" + (i + 1));
            var datas = [];
            var val;
            $tds.each(function() {
                if ($(this).find('.originalData .undefined').text() != "") {
                    datas.push(undefined);
                } else {
                    val = $(this).find('.originalData').text();
                    datas.push(val);
                }
            });
            if (xcSuggest.suggestDateType(datas, type, 0.9)) {
                dateIndex.push(i);
                dateKeys.push(key);
            }
            var obj = {};
            obj[key] = type;
            schema.push(obj);
        }
        if (dateIndex.length != 0) {
            var msg = AlertTStr.SendSchemaDateDetectedMsg + "\n";
            dateKeys.forEach(function(col) {
                msg += col + ", ";
            })
            msg = msg.slice(0,-2);
            Alert.show({
                "title": AlertTStr.SendSchemaDateDetectedTitle,
                "msg": msg,
                "hideButtons": ["cancel"],
                "buttons": [{
                    "name": "No",
                    "func": function() {
                        deferred.resolve(schema);
                    }
                },
                {
                    "name": "Yes",
                    "func": function() {
                        for (var i = 0; i < dateIndex.length; i++) {
                            schema[dateIndex[i]][dateKeys[i]] = "date";
                        }
                        deferred.resolve(schema);
                    }
                }
                ]
            });
            $("#alertHeader").find(".close").hide();
        } else {
            deferred.resolve(schema);
        }
        return deferred.promise();
    }

    /*
    operationalize: Converts prefix fields to derived fields and removes object
        and array fields from the given input table.
    */
    function updatePlanServer(struct) {
        var deferred = PromiseHelper.deferred();
        jQuery.ajax({
            type: 'PUT',
            data: JSON.stringify(struct),
            contentType: 'application/json; charset=utf-8',
            url: planServer + "/schemaupdate/" +
                 encodeURIComponent(encodeURIComponent(WorkbookManager.getActiveWKBK())),
            success: function(data) {
                try {
                    deferred.resolve(data);
                } catch (e) {
                    deferred.reject(e);
                    console.error(e);
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
            var tableId;
            var structToSend = {};
            var tableName = ext.getArgs().sqlTableName;
            var finalizedTableName;

            finalizeTable(srcTable, ext)
            .then(function(newTableName) {
                finalizedTableName = newTableName;
                tableId = newTableName.split("#")[1];
                return getSchema(tableId);
            })
            .then(function(schema) {
                var tableMetaCol = {};
                tableMetaCol["XC_TABLENAME_" + finalizedTableName] = "string";
                schema.push(tableMetaCol);

                structToSend.tableName = tableName.toUpperCase();
                structToSend.tableColumns = schema;

                console.log(structToSend);
                return updatePlanServer(structToSend);
            })
            .then(function() {
                return SQLEditor.updateSchema(structToSend, tableId);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }

    return UExtSendSchema;
}({}));